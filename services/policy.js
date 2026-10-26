const SENDERS = ["FARMER", "TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR"];
const RECEIVERS = ["TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR", "RETAILER"];
const OPEN_STAGES = ["CREATED", "IN_TRANSIT", "IN_STORAGE"];

const RULES = {
  TRANSFER_INITIATED: { roles: SENDERS,   access: "CUSTODIAN", stages: OPEN_STAGES },
  TRANSFER_CONFIRMED: { roles: RECEIVERS, access: "RECEIVER",  stages: OPEN_STAGES },
  QUALITY_CHECK:      { roles: ["INSPECTOR"], access: "ANY", stages: ["CREATED", "IN_TRANSIT", "IN_STORAGE", "AT_RETAILER"] },
  TRANSFER_REJECTED:  { roles: RECEIVERS, access: "RECEIVER",  stages: OPEN_STAGES },
};

// who may hand a batch to whom (ADMIN is deliberately absent)
const TRANSFER_RULES = {
  FARMER:      ["TRANSPORTER"],
  TRANSPORTER: ["WAREHOUSE", "DISTRIBUTOR"],
  WAREHOUSE:   ["DISTRIBUTOR"],
  DISTRIBUTOR: ["RETAILER"],
  RETAILER:    [],
};

// stage after the receiver confirms
const STAGE_AFTER_RECEIVE = {
  TRANSPORTER: "IN_TRANSIT",
  WAREHOUSE:   "IN_STORAGE",
  DISTRIBUTOR: "IN_STORAGE",
  RETAILER:    "AT_RETAILER",
};

const same = (a, b) => Boolean(a && b && String(a) === String(b));
const deny = (reason) => ({ ok: false, reason });

function authorize({ user, batch, eventType }) {
  const rule = RULES[eventType];
  if (!rule) return deny("Unknown event type");
  if (batch.onHold) return deny("Batch is on hold");
  if (!rule.roles.includes(user.role)) return deny(`${user.role} cannot do ${eventType}`);
  if (!rule.stages.includes(batch.stage)) return deny(`Not allowed at stage ${batch.stage}`);

  if (rule.access === "CUSTODIAN") {
    if (!same(batch.currentCustodian, user.id)) return deny("You are not the current custodian");
    if (eventType === "TRANSFER_INITIATED" && batch.pendingTransfer?.to)
      return deny("A transfer is already pending for this batch");
  }
  if (rule.access === "RECEIVER" && !same(batch.pendingTransfer?.to, user.id))
    return deny("Only the designated receiver can do this");

  return { ok: true };
}

// `receiver` is a User document loaded from MongoDB, never client data
function canTransferTo(sender, receiver) {
  if (!receiver) return deny("Receiver not found");
  if (receiver.status !== "ACTIVE") return deny("Receiver account is not active");
  if (same(receiver._id, sender.id)) return deny("You cannot transfer to yourself");
  if (!(TRANSFER_RULES[sender.role] || []).includes(receiver.role))
    return deny(`${sender.role} cannot transfer to ${receiver.role}`);
  return { ok: true };
}

module.exports = { authorize, canTransferTo, TRANSFER_RULES, STAGE_AFTER_RECEIVE };