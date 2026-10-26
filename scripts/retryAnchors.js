// Anchors every event that is still PENDING or FAILED, oldest first (keeps hash-chain order per batch)
require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("../models/Event");
const { anchorEvent, isEnabled, whenIdle } = require("../services/blockchainService");

(async () => {
  if (!isEnabled()) { console.log("Blockchain env vars not set (RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS)."); return; }
  await mongoose.connect(process.env.MONGO_URI);
  const events = await Event.find({ "blockchain.status": { $in: ["PENDING", "FAILED"] } }).sort({ _id: 1 });
  console.log(`Retrying ${events.length} event(s)...`);
  events.forEach(anchorEvent);
  await whenIdle();
  await mongoose.disconnect();
})();
