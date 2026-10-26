const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  try {
    // 1. Read the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required. Please log in.",
      });
    }

    // 2. Extract the token
    const token = authHeader.split(" ")[1];

    // 3. Verify the token's signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Find the user associated with the token
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        message: "User associated with this token no longer exists.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Your account is not active.",
      });
    }

    // 5. Attach user information to the request
    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    // 6. Allow the request to continue
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token. Please log in again.",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};