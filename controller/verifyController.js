const Batch = require("../models/Batch");
const { verifyChain } = require("../services/verifyService");

exports.publicBatchView = (batch, chain) => ({
  valid: chain.valid,
  batch: {
    batchId: batch.batchId,
    produceType: batch.produceType,
    category: batch.category,
    quantity: batch.quantity,
    unit: batch.unit,
    harvestDate: batch.harvestDate,
    origin: { village: batch.origin.village, district: batch.origin.district, state: batch.origin.state, lat: batch.origin.lat, lng: batch.origin.lng },
    stage: batch.stage,
    onHold: batch.onHold,
    holdReason: batch.onHold ? batch.holdReason : undefined,
  },
  eventCount: chain.timeline.length,
  anchoredOnChain: chain.timeline.filter((t) => t.blockchain.status === "CONFIRMED").length,
  timeline: chain.timeline,
});

// GET /api/verify/:batchId  (public). Recomputes all hashes, so edits made directly in the database are detected.
exports.verifyBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    return res.json(exports.publicBatchView(batch, await verifyChain(batch.batchId)));
  } catch (error) {
    console.error("Verify error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
