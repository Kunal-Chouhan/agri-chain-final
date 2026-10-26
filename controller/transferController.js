const mongoose = require("mongoose");
const Batch = require("../models/Batch");
const User = require("../models/User");
const { recordEvent } = require("../services/eventService");
const { authorize, canTransferTo, STAGE_AFTER_RECEIVE } = require("../services/policy");

const fail = (res, status, message) => res.status(status).json({ message });

// POST /api/batches/:batchId/transfer   { receiverId, price? }
exports.initiateTransfer = async (req, res) => {
  try {
    const { receiverId, price } = req.body ?? {};
    if (!mongoose.isValidObjectId(receiverId)) return fail(res, 400, "A valid receiverId is required");
    if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) < 0))
      return fail(res, 400, "price must be a number, 0 or more");

    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) return fail(res, 404, "Batch not found");

    const allowed = authorize({ user: req.user, batch, eventType: "TRANSFER_INITIATED" });
    if (!allowed.ok) return fail(res, 403, allowed.reason);

    const receiver = await User.findById(receiverId);
    const route = canTransferTo(req.user, receiver);
    if (!route.ok) return fail(res, 400, route.reason);

    // Atomic guard: succeeds only if I am still custodian and nothing is pending
    const updated = await Batch.findOneAndUpdate(
      {
        _id: batch._id,
        currentCustodian: req.user.id,
        onHold: { $ne: true },
        "pendingTransfer.to": { $exists: false },
      },
      { $set: { pendingTransfer: { to: receiver._id, initiatedAt: new Date() } } },
      { returnDocument: "after" }
    );
    if (!updated) return fail(res, 409, "Batch changed while processing. Please retry.");

    const event = await recordEvent({
      batch: updated,
      eventType: "TRANSFER_INITIATED",
      actor: req.user,
      details: {
        fromId: req.user.id,
        toId: String(receiver._id),
        toRole: receiver.role,
        quantity: updated.quantity,
        unit: updated.unit,
        ...(price !== undefined && { price: Number(price), currency: "INR" }),
      },
    });

    return res.status(200).json({
      message: "Transfer initiated. Waiting for the receiver to confirm.",
      pendingTo: { id: receiver._id, name: receiver.name, role: receiver.role },
      event: { eventType: event.eventType, dataHash: event.dataHash },
    });
  } catch (error) {
    console.error("Initiate transfer error:", error);
    return fail(res, 500, "Internal server error");
  }
};

// POST /api/batches/:batchId/confirm
exports.confirmTransfer = async (req, res) => {
  try {
    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) return fail(res, 404, "Batch not found");

    const allowed = authorize({ user: req.user, batch, eventType: "TRANSFER_CONFIRMED" });
    if (!allowed.ok) return fail(res, 403, allowed.reason);

    const fromId = String(batch.currentCustodian);
    const newStage = STAGE_AFTER_RECEIVE[req.user.role];

    // Atomic guard: a second confirmation finds no pending transfer and gets null
    const updated = await Batch.findOneAndUpdate(
      { _id: batch._id, "pendingTransfer.to": req.user.id, onHold: { $ne: true } },
      { $set: { currentCustodian: req.user.id, stage: newStage }, $unset: { pendingTransfer: "" } },
      { returnDocument: "after" }
    );
    if (!updated) return fail(res, 409, "This transfer was already handled or has changed");

    const event = await recordEvent({
      batch: updated,
      eventType: "TRANSFER_CONFIRMED",
      actor: req.user,
      details: { fromId, toId: req.user.id, stage: newStage },
    });

    return res.status(200).json({
      message: "Receipt confirmed. You are now the custodian.",
      batch: { batchId: updated.batchId, stage: updated.stage },
      event: { eventType: event.eventType, dataHash: event.dataHash },
    });
  } catch (error) {
    console.error("Confirm transfer error:", error);
    return fail(res, 500, "Internal server error");
  }
};

// POST /api/batches/:batchId/reject   { reason? }
exports.rejectTransfer = async (req, res) => {
  try {
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "";

    const batch = await Batch.findOne({ batchId: req.params.batchId });
    if (!batch) return fail(res, 404, "Batch not found");

    const allowed = authorize({ user: req.user, batch, eventType: "TRANSFER_REJECTED" });
    if (!allowed.ok) return fail(res, 403, allowed.reason);

    const updated = await Batch.findOneAndUpdate(
      { _id: batch._id, "pendingTransfer.to": req.user.id },
      { $unset: { pendingTransfer: "" } },
      { returnDocument: "after" }
    );
    if (!updated) return fail(res, 409, "This transfer was already handled or has changed");

    const event = await recordEvent({
      batch: updated,
      eventType: "TRANSFER_REJECTED",
      actor: req.user,
      details: { rejectedBy: req.user.id, custodianStays: String(updated.currentCustodian), reason },
    });

    return res.status(200).json({
      message: "Transfer rejected. The batch stays with the sender.",
      event: { eventType: event.eventType, dataHash: event.dataHash },
    });
  } catch (error) {
    console.error("Reject transfer error:", error);
    return fail(res, 500, "Internal server error");
  }
};