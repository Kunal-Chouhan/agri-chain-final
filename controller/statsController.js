const Batch = require("../models/Batch");
const Event = require("../models/Event");
const User = require("../models/User");

// Aggregate numbers shared by the public landing page, dashboards and the dataset API.
exports.computeStats = async () => {
  const [batches, events, stages, produce, states, onHold, farmers, quantity, byType, recent] = await Promise.all([
    Batch.countDocuments(),
    Event.countDocuments(),
    Batch.aggregate([{ $group: { _id: "$stage", count: { $sum: 1 } } }]),
    Batch.aggregate([{ $group: { _id: "$produceType", count: { $sum: 1 }, quantity: { $sum: "$quantity" } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
    Batch.aggregate([{ $group: { _id: "$origin.state", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Batch.countDocuments({ onHold: true }),
    User.countDocuments({ role: "FARMER" }),
    Batch.aggregate([{ $group: { _id: "$unit", total: { $sum: "$quantity" } } }]),
    Event.aggregate([{ $group: { _id: "$eventType", count: { $sum: 1 } } }]),
    Event.find().sort({ _id: -1 }).limit(60).select("batchId eventType actorRole createdAt payload.timestamp"),
  ]);
  const map = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const anchored = await Event.countDocuments({ "blockchain.status": "CONFIRMED" });
  return {
    batches, events, farmers, onHold,
    totalQuantityKg: quantity.reduce((a, q) => a + q.total * ({ kg: 1, quintal: 100, ton: 1000 }[q._id] || 1), 0),
    anchoredEvents: anchored,
    stages: map(stages),
    eventTypes: map(byType),
    topProduce: produce.map((p) => ({ produceType: p._id, batches: p.count, quantity: p.quantity })),
    states: states.map((s) => ({ state: s._id, batches: s.count })),
    recentEvents: recent.filter((e, i, a) => a.findIndex((x) => x.batchId === e.batchId) === i).slice(0, 8).map((e) => ({ batchId: e.batchId, eventType: e.eventType, actorRole: e.actorRole, at: e.payload?.timestamp || e.createdAt })),
  };
};

// GET /api/stats  (public)
exports.publicStats = async (req, res) => {
  try { return res.json(await exports.computeStats()); }
  catch (e) { console.error("Stats error:", e); return res.status(500).json({ message: "Internal server error" }); }
};
