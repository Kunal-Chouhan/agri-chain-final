const { ethers } = require("ethers");
const Event = require("../models/Event");

const ABI = [
  "function anchor(string batchId, bytes32 dataHash, bytes32 prevHash)",
  "function anchorCount(string batchId) view returns (uint256)",
];

let contract; // undefined = not initialised, null = disabled
let queue = Promise.resolve(); // one tx at a time, so nonces and hash-chain order stay correct

function getContract() {
  if (contract !== undefined) return contract;
  const { RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;
  if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) return (contract = null);
  const wallet = new ethers.Wallet(PRIVATE_KEY, new ethers.JsonRpcProvider(RPC_URL));
  return (contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet));
}

const toBytes32 = (h) => (h === "0x0" ? ethers.ZeroHash : h);

exports.isEnabled = () => Boolean(getContract());
exports.whenIdle = () => queue;

// Fire-and-forget: the API response never waits for the blockchain
exports.anchorEvent = (event) => {
  const c = getContract();
  if (!c) return;
  queue = queue.then(async () => {
    try {
      const tx = await c.anchor(event.batchId, toBytes32(event.dataHash), toBytes32(event.prevHash));
      const receipt = await tx.wait();
      await Event.updateOne({ _id: event._id }, {
        $set: {
          "blockchain.status": "CONFIRMED",
          "blockchain.txHash": tx.hash,
          "blockchain.blockNumber": receipt.blockNumber,
          "blockchain.confirmedAt": new Date(),
        },
        $unset: { "blockchain.error": "" },
      });
    } catch (err) {
      console.error("Anchor failed:", err.shortMessage || err.message);
      await Event.updateOne({ _id: event._id }, {
        $set: { "blockchain.status": "FAILED", "blockchain.error": String(err.shortMessage || err.message).slice(0, 300) },
      }).catch(() => {});
    }
  });
};
