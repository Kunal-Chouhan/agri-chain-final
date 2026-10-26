const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { createBatch, listIncoming, listMine, getBatchTimeline } = require("../controller/batchController");
const { initiateTransfer, confirmTransfer, rejectTransfer } = require("../controller/transferController");

const { addQualityCheck } = require("../controller/qualityController");

const SENDERS = ["FARMER", "TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR"];
const RECEIVERS = ["TRANSPORTER", "WAREHOUSE", "DISTRIBUTOR", "RETAILER"];

router.post("/", protect, authorizeRoles("FARMER"), createBatch);
router.get("/incoming", protect, listIncoming);          // must stay above "/:batchId"
router.get("/mine", protect, listMine);                  // must stay above "/:batchId"
router.get("/:batchId", protect, getBatchTimeline);
router.post("/:batchId/transfer", protect, authorizeRoles(...SENDERS), initiateTransfer);
router.post("/:batchId/quality", protect, authorizeRoles("INSPECTOR"), addQualityCheck);
router.post("/:batchId/confirm", protect, authorizeRoles(...RECEIVERS), confirmTransfer);
router.post("/:batchId/reject", protect, authorizeRoles(...RECEIVERS), rejectTransfer);

module.exports = router;