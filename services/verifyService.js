const Event = require("../models/Event");
const { hashRecord } = require("./hash");

// Recompute every hash and prevHash link of one batch. Returns the public (no personal IDs) timeline.
exports.verifyChain = async (batchId) => {
  const events = await Event.find({ batchId }).sort({ _id: 1 });
  let prev = "0x0";
  let valid = true;
  const timeline = events.map((e) => {
    const hashOk = hashRecord(e.payload) === e.dataHash;
    const linkOk = e.prevHash === prev && e.payload?.prevHash === prev;
    if (!hashOk || !linkOk) valid = false;
    prev = e.dataHash;
    const p = e.payload || {};
    return {
      eventType: e.eventType,
      actorRole: e.actorRole,
      timestamp: p.timestamp || e.createdAt,
      dataHash: e.dataHash,
      prevHash: e.prevHash,
      hashOk,
      linkOk,
      details: publicDetails(e.eventType, p),
      blockchain: { status: e.blockchain?.status, txHash: e.blockchain?.txHash, blockNumber: e.blockchain?.blockNumber },
    };
  });
  return { valid, timeline };
};

// Only non-personal facts are exposed publicly (never user ids).
function publicDetails(type, p) {
  switch (type) {
    case "BATCH_CREATED": return { produceType: p.produceType, quantity: p.quantity, unit: p.unit, origin: p.origin && { village: p.origin.village, district: p.origin.district, state: p.origin.state } };
    case "TRANSFER_INITIATED": return { toRole: p.toRole, price: p.price, currency: p.currency };
    case "TRANSFER_CONFIRMED": return { stage: p.stage };
    case "TRANSFER_REJECTED": return { reason: p.reason };
    case "QUALITY_CHECK": return { grade: p.grade, passed: p.passed, moisturePct: p.moisturePct, temperatureC: p.temperatureC, notes: p.notes };
    default: return {};
  }
}
