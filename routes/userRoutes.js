// userRoutes.js
const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { listReceivers } = require("../controller/userController");
router.get("/receivers", protect, listReceivers);
module.exports = router;