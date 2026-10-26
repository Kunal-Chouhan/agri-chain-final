require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDb = require("./config/db");

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false });

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
// SPA-style deep links (e.g. /verify/BATCH-123 from a QR code) serve the same page
app.get(["/verify/:batchId", "/verify"], (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use("/api/auth", authLimiter, require("./routes/authRoutes"));
app.use("/api/batches", require("./routes/batchRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/verify", require("./routes/verifyRoutes"));
app.get("/api/stats", require("./controller/statsController").publicStats);
app.use("/api/v1", require("./routes/datasetRoutes"));

app.use("/api", (req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid JSON body" });
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing in .env");
  process.exit(1);
}
connectDb().then(() => app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT)));
