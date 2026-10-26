const mongoose = require("mongoose")
const bcrypt = require("bcryptjs");


const userSchema = new mongoose.Schema(
  {
    name:{
      type: String,
      required: true,
      trim: true,
    },
    organization: { type: String, trim: true }, 
    phone: { type: String, trim: true },
    email:{
      type: String,
      required:true,
      unique:true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "FARMER",
        "TRANSPORTER",
        "WAREHOUSE",
        "DISTRIBUTOR",
        "RETAILER",
        "INSPECTOR",
        "ADMIN",
      ],
      required: true,
      default: "FARMER",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },

  },
  {
    timestamps:true
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("User",userSchema);
