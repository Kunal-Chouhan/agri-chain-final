const router = require("express").Router();
const { verifyBatch } = require("../controller/verifyController");

// public: anyone with a batch ID (e.g. from a QR code) can trace and verify it
router.get("/:batchId", verifyBatch);

module.exports = router;
