const crypto = require("crypto");
const Batch = require("../models/Batch");
const Event = require("../models/Event");
const { recordEvent } = require("../services/eventService");

const makeBatchId = () =>
  `BATCH-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

// POST /api/batches  (FARMER)
exports.createBatch = async (req, res) => {
  try {
    const { produceType, category, quantity, unit, harvestDate, origin } = req.body ?? {};

    if (!produceType || !category || !quantity || !harvestDate ||
        !origin?.village || !origin?.district || !origin?.state) {
      return res.status(400).json({ message: "Please provide all required batch details" });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0)
      return res.status(400).json({ message: "quantity must be a number greater than 0" });
    const harvest = new Date(harvestDate);
    if (Number.isNaN(harvest.getTime()) || harvest > new Date())
      return res.status(400).json({ message: "harvestDate must be a valid date, not in the future" });

    const batch = await Batch.create({
      batchId: makeBatchId(),
      produceType, category, quantity: qty, unit,
      harvestDate: harvest, origin,
      farmer: req.user.id,
      currentCustodian: req.user.id,
      stage: "CREATED",
    });

    const event = await recordEvent({
      batch,
      eventType: "BATCH_CREATED",
      actor: req.user,
      details: {
        produceType: batch.produceType,
        category: batch.category,
        quantity: batch.quantity,
        unit: batch.unit,
        harvestDate: batch.harvestDate.toISOString(),
        origin: {
          village: batch.origin.village, district: batch.origin.district, state: batch.origin.state,
          lat: batch.origin.lat, lng: batch.origin.lng,
        },
      },
    });

    return res.status(201).json({
      message: "Agricultural batch created successfully",
      batch,
      event: { eventType: event.eventType, dataHash: event.dataHash },
    });
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError")
      return res.status(400).json({ message: "Invalid batch details" });
    console.error("Create batch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/batches/incoming  (batches waiting for ME to confirm)
exports.listIncoming = async (req, res) => {
  try {
    const batches = await Batch.find({ "pendingTransfer.to": req.user.id }).sort({ updatedAt: -1 });
    return res.json({ count: batches.length, batches });
  } catch (error) {
    console.error("List incoming error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/batches/:batchId  (batch + timeline, only for people involved)
exports.getBatchTimeline = async (req, res) => {
  try {
    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const me = req.user.id;
    const involved =
      ["ADMIN", "INSPECTOR"].includes(req.user.role) ||
      String(batch.farmer) === me ||
      String(batch.currentCustodian) === me ||
      String(batch.pendingTransfer?.to) === me ||
      (await Event.exists({ batchId: batch.batchId, actor: me }));

    if (!involved) return res.status(403).json({ message: "You do not have access to this batch" });

    const events = await Event.find({ batchId: batch.batchId }).sort({ _id: 1 })
      .select("eventType actorRole payload dataHash prevHash createdAt");
    return res.json({ batch, events });
  } catch (error) {
    console.error("Get batch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/batches/mine  (batches I created or currently hold)
exports.listMine = async (req, res) => {
  try {
    const batches = await Batch.find({ $or: [{ farmer: req.user.id }, { currentCustodian: req.user.id }] }).sort({ updatedAt: -1 });
    return res.json({ count: batches.length, batches });
  } catch (error) {
    console.error("List mine error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
