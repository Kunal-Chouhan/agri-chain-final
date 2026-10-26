const mongoose = require("mongoose");
const User = require("../models/User");
const Batch = require("../models/Batch");

const CREATABLE = ["FARMER", "TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR", "RETAILER", "INSPECTOR"];

// POST /api/admin/users  (ADMIN only; ADMIN accounts are never created through the API)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, organization, phone } = req.body ?? {};
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email.trim())
      return res.status(400).json({ message: "name, email and password are required" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    if (!CREATABLE.includes(role)) return res.status(400).json({ message: `role must be one of ${CREATABLE.join(", ")}` });

    const user = await User.create({
      name: name.trim(), email: email.trim().toLowerCase(), password, role, organization, phone,
    });
    return res.status(201).json({ message: "User created", user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Email is already registered" });
    if (error.name === "ValidationError") return res.status(400).json({ message: "Invalid user data" });
    console.error("Create user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select("name email role status organization createdAt");
    return res.json({ count: users.length, users });
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/admin/users/:id/status   { status: "ACTIVE" | "SUSPENDED" }
exports.setUserStatus = async (req, res) => {
  try {
    const { status } = req.body ?? {};
    if (!["ACTIVE", "SUSPENDED"].includes(status)) return res.status(400).json({ message: "status must be ACTIVE or SUSPENDED" });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user id" });
    if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot change your own status" });
    const upd = await User.updateOne({ _id: req.params.id }, { status });
    if (!upd.matchedCount) return res.status(404).json({ message: "User not found" });
    const user = await User.findById(req.params.id).select("name email role status");
    return res.json({ message: `User ${status.toLowerCase()}`, user });
  } catch (error) {
    console.error("Set status error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/admin/batches/:batchId/hold   { onHold: true|false, reason? }  (recall / quarantine)
exports.setBatchHold = async (req, res) => {
  try {
    const { onHold, reason } = req.body ?? {};
    if (typeof onHold !== "boolean") return res.status(400).json({ message: "onHold must be true or false" });
    const batch = await Batch.findOneAndUpdate(
      { batchId: req.params.batchId },
      { onHold, holdReason: onHold && typeof reason === "string" ? reason.trim().slice(0, 300) : undefined },
      { returnDocument: "after" }
    );
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    return res.json({ message: onHold ? "Batch placed on hold" : "Hold removed", batch: { batchId: batch.batchId, onHold: batch.onHold, holdReason: batch.holdReason } });
  } catch (error) {
    console.error("Set hold error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------- overview, batches, API keys ---------- */
const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");
const { sha256 } = require("../middleware/apiKeyMiddleware");
const { computeStats } = require("./statsController");

// GET /api/admin/overview
exports.overview = async (req, res) => {
  try {
    const [stats, users, held] = await Promise.all([
      computeStats(),
      User.aggregate([{ $group: { _id: { role: "$role", status: "$status" }, count: { $sum: 1 } } }]),
      Batch.find({ onHold: true }).select("batchId produceType holdReason"),
    ]);
    const roles = {}; let suspended = 0;
    users.forEach((u) => { roles[u._id.role] = (roles[u._id.role] || 0) + u.count; if (u._id.status === "SUSPENDED") suspended += u.count; });
    return res.json({ stats, roles, suspended, held });
  } catch (error) { console.error("Overview error:", error); return res.status(500).json({ message: "Internal server error" }); }
};

// GET /api/admin/batches?q=
exports.listBatches = async (req, res) => {
  try {
    const q = typeof req.query.q === "string" && req.query.q.trim()
      ? { $or: [{ batchId: new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }, { produceType: new RegExp(req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }] }
      : {};
    const batches = await Batch.find(q).sort({ updatedAt: -1 }).limit(100).select("batchId produceType quantity unit stage onHold holdReason origin updatedAt");
    return res.json({ count: batches.length, batches });
  } catch (error) { console.error("Admin batches error:", error); return res.status(500).json({ message: "Internal server error" }); }
};

// GET /api/admin/apikeys
exports.listApiKeys = async (req, res) => {
  const keys = await ApiKey.find().sort({ createdAt: -1 }).select("-keyHash");
  return res.json({ count: keys.length, keys });
};

// POST /api/admin/apikeys  { name }  -> the plaintext key is returned once
exports.createApiKey = async (req, res) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 60) : "";
    if (!name) return res.status(400).json({ message: "name is required" });
    const key = "agri_" + crypto.randomBytes(24).toString("hex");
    const doc = await ApiKey.create({ name, keyHash: sha256(key), prefix: key.slice(0, 10), createdBy: req.user.id });
    return res.status(201).json({ message: "API key created. Copy it now; it is not shown again.", key, id: doc._id, name });
  } catch (error) { console.error("Create key error:", error); return res.status(500).json({ message: "Internal server error" }); }
};

// PATCH /api/admin/apikeys/:id  { active }
exports.setApiKeyActive = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid key id" });
    if (typeof req.body?.active !== "boolean") return res.status(400).json({ message: "active must be true or false" });
    const upd = await ApiKey.updateOne({ _id: req.params.id }, { active: req.body.active });
    if (!upd.matchedCount) return res.status(404).json({ message: "Key not found" });
    const k = await ApiKey.findById(req.params.id).select("-keyHash");
    return res.json({ message: k.active ? "Key enabled" : "Key revoked", key: k });
  } catch (error) { console.error("Key toggle error:", error); return res.status(500).json({ message: "Internal server error" }); }
};
