require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = (process.env.ADMIN_EMAIL || "admin@agrichain.local").toLowerCase();
    if (await User.findOne({ email })) {
      console.log("Admin already exists:", email);
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || "Platform Admin",
        email,
        password: process.env.ADMIN_PASSWORD || "ChangeMe@123",
        role: "ADMIN",
      });
      console.log("Admin created:", email);
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    await mongoose.disconnect();
  }
})();
