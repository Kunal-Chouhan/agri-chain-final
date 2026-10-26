const User = require("../models/User");
const { TRANSFER_RULES } = require("../services/policy");

// GET /api/users/receivers: active users my role may transfer to
exports.listReceivers = async (req, res) => {
  try {
    const roles = TRANSFER_RULES[req.user.role] || [];
    const users = await User.find({ role: { $in: roles }, status: "ACTIVE", _id: { $ne: req.user.id } })
      .select("name role organization");
    return res.json({ count: users.length, receivers: users });
  } catch (error) {
    console.error("List receivers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};