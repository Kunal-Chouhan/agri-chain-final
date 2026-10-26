const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    produceType: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },

    unit: {
      type: String,
      enum: ["kg", "quintal", "ton"],
      default: "kg",
    },

    harvestDate: {
      type: Date,
      required: true,
    },

    origin: {
      village: {
        type: String,
        required: true,
      },
      district: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      lat: Number,
      lng: Number,
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    currentCustodian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    stage: {
      type: String,
      enum: [
        "CREATED",
        "IN_TRANSIT",
        "IN_STORAGE",
        "AT_RETAILER",
        "SOLD",
      ],
      default: "CREATED",
    },
         onHold: { type: Boolean, default: false },
    holdReason: String,

    pendingTransfer: {
      to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      initiatedAt: Date,
    }, 
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Batch", batchSchema);
