const crypto = require("crypto");
const ApiKey = require("../models/ApiKey");

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
exports.sha256 = sha256;

// Accepts `x-api-key: <key>` or `Authorization: ApiKey <key>`. Read-only access to the dataset API.
exports.requireApiKey = async (req, res, next) => {
  try {
    const header = req.headers["x-api-key"] ||
      (req.headers.authorization?.startsWith("ApiKey ") ? req.headers.authorization.slice(7) : "");
    if (!header || typeof header !== "string")
      return res.status(401).json({ message: "API key required. Send it in the x-api-key header." });

    const key = await ApiKey.findOneAndUpdate(
      { keyHash: sha256(header.trim()), active: true },
      { $set: { lastUsedAt: new Date() }, $inc: { requestCount: 1 } },
      { returnDocument: "after" }
    );
    if (!key) return res.status(401).json({ message: "Invalid or revoked API key." });
    req.apiKey = { id: key._id.toString(), name: key.name, scope: key.scope };
    next();
  } catch (err) {
    console.error("API key error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
