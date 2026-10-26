const hre = require("hardhat");

async function main() {
  const Ledger = await hre.ethers.getContractFactory("SupplyChainLedger");
  const ledger = await Ledger.deploy();
  await ledger.waitForDeployment();
  console.log("SupplyChainLedger deployed to:", await ledger.getAddress());
  console.log("Put this in .env as CONTRACT_ADDRESS");
}
main().catch((e) => { console.error(e); process.exit(1); });
