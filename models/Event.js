const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", required: true },
    batchId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: ["BATCH_CREATED", "TRANSFER_INITIATED", "TRANSFER_CONFIRMED", "TRANSFER_REJECTED", "STORED", "QUALITY_CHECK", "CORRECTION"],
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorRole: String,

    payload: { type: mongoose.Schema.Types.Mixed, required: true }, // exactly what was hashed
    dataHash: { type: String, required: true },
    prevHash: { type: String, required: true },                      // "0x0" for the first event

    blockchain: {
      status: { type: String, enum: ["PENDING", "CONFIRMED", "FAILED"], default: "PENDING" },
      txHash: String,
      blockNumber: Number,
      confirmedAt: Date,
      error: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);