const Batch = require("../models/Batch");
const { verifyChain } = require("../services/verifyService");
const { publicBatchView } = require("./verifyController");
const { computeStats } = require("./statsController");

const summary = (b) => ({
  batchId: b.batchId, produceType: b.produceType, category: b.category, quantity: b.quantity, unit: b.unit,
  harvestDate: b.harvestDate, stage: b.stage, onHold: b.onHold,
  origin: { village: b.origin.village, district: b.origin.district, state: b.origin.state },
  createdAt: b.createdAt, updatedAt: b.updatedAt,
});

// GET /api/v1/batches?stage=&produce=&state=&category=&page=&limit=
exports.listBatches = async (req, res) => {
  try {
    const q = {};
    const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
    if (str(req.query.stage)) q.stage = req.query.stage.toUpperCase();
    if (str(req.query.category)) q.category = new RegExp(`^${esc(req.query.category)}$`, "i");
    if (str(req.query.produce)) q.produceType = new RegExp(`^${esc(req.query.produce)}$`, "i");
    if (str(req.query.state)) q["origin.state"] = new RegExp(`^${esc(req.query.state)}$`, "i");
    if (req.query.onHold === "true") q.onHold = true;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const [total, rows] = await Promise.all([
      Batch.countDocuments(q),
      Batch.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ]);
    res.json({ total, page, limit, pages: Math.ceil(total / limit), data: rows.map(summary) });
  } catch (e) { console.error(e); res.status(500).json({ message: "Internal server error" }); }
};

// GET /api/v1/batches/:batchId  (summary + verified timeline)
exports.getBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json(publicBatchView(batch, await verifyChain(batch.batchId)));
  } catch (e) { console.error(e); res.status(500).json({ message: "Internal server error" }); }
};

// GET /api/v1/stats
exports.stats = async (req, res) => {
  try { res.json(await computeStats()); }
  catch (e) { console.error(e); res.status(500).json({ message: "Internal server error" }); }
};

function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
