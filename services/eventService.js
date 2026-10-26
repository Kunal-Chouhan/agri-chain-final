const Event = require("../models/Event");
const { hashRecord } = require("./hash");
const { anchorEvent } = require("./blockchainService");

exports.recordEvent = async ({ batch, eventType, actor, details = {}, at }) => {
  const last = await Event.findOne({ batchId: batch.batchId }).sort({ _id: -1 }).select("dataHash");
  const prevHash = last ? last.dataHash : "0x0";

  const payload = {
    batchId: batch.batchId,
    eventType,
    actorId: String(actor.id),
    actorRole: actor.role,
    timestamp: (at ? new Date(at) : new Date()).toISOString(),
    prevHash,
    ...details,
  };
  const dataHash = hashRecord(payload);

  const event = await Event.create({
    batch: batch._id,
    batchId: batch.batchId,
    eventType,
    actor: actor.id,
    actorRole: actor.role,
    payload,
    dataHash,
    prevHash,
    ...(at && { createdAt: new Date(at) }),
  });

  anchorEvent(event);
  return event;
};
