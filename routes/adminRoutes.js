const router = require("express").Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const a = require("../controller/adminController");

router.use(protect, authorizeRoles("ADMIN"));
router.get("/overview", a.overview);
router.post("/users", a.createUser);
router.get("/users", a.listUsers);
router.patch("/users/:id/status", a.setUserStatus);
router.get("/batches", a.listBatches);
router.patch("/batches/:batchId/hold", a.setBatchHold);
router.get("/apikeys", a.listApiKeys);
router.post("/apikeys", a.createApiKey);
router.patch("/apikeys/:id", a.setApiKeyActive);

module.exports = router;
