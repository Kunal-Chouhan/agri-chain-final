const Batch = require("../models/Batch");
const { recordEvent } = require("../services/eventService");
const { authorize } = require("../services/policy");

const GRADES = ["A", "B", "C", "REJECT"];

// POST /api/batches/:batchId/quality  (INSPECTOR)  { grade, passed?, moisturePct?, temperatureC?, notes? }
exports.addQualityCheck = async (req, res) => {
  try {
    const { grade, moisturePct, temperatureC, notes } = req.body ?? {};
    if (!GRADES.includes(grade)) return res.status(400).json({ message: `grade must be one of ${GRADES.join(", ")}` });
    const num = (v, name, lo, hi) => {
      if (v === undefined || v === "" || v === null) return undefined;
      const n = Number(v);
      if (!Number.isFinite(n) || n < lo || n > hi) throw new Error(`${name} must be a number between ${lo} and ${hi}`);
      return n;
    };
    let moisture, temp;
    try { moisture = num(moisturePct, "moisturePct", 0, 100); temp = num(temperatureC, "temperatureC", -40, 80); }
    catch (e) { return res.status(400).json({ message: e.message }); }

    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    const allowed = authorize({ user: req.user, batch, eventType: "QUALITY_CHECK" });
    if (!allowed.ok) return res.status(403).json({ message: allowed.reason });

    const event = await recordEvent({
      batch, eventType: "QUALITY_CHECK", actor: req.user,
      details: {
        grade, passed: grade !== "REJECT",
        ...(moisture !== undefined && { moisturePct: moisture }),
        ...(temp !== undefined && { temperatureC: temp }),
        ...(typeof notes === "string" && notes.trim() && { notes: notes.trim().slice(0, 300) }),
      },
    });
    return res.status(201).json({ message: "Quality check recorded", event: { eventType: event.eventType, dataHash: event.dataHash } });
  } catch (error) {
    console.error("Quality check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
