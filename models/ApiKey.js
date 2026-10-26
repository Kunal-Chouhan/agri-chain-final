const mongoose = require("mongoose");

// Only the SHA-256 of a key is stored; the plaintext is shown once at creation.
const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, required: true },          // first chars, for display only
    scope: { type: String, enum: ["READ"], default: "READ" },
    isDemo: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastUsedAt: Date,
    requestCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ApiKey", apiKeySchema);
