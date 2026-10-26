const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { requireApiKey } = require("../middleware/apiKeyMiddleware");
const { listBatches, getBatch, stats } = require("../controller/datasetController");

// Read-only dataset API for partners, researchers and the demo. Needs a key from `npm run seed:demo`.
router.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
router.use(requireApiKey);
router.get("/batches", listBatches);
router.get("/batches/:batchId", getBatch);
router.get("/stats", stats);

module.exports = router;
