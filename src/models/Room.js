const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: Number,
      required: true,
      unique: true,
      trim: true,
    },

    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔥 optional: track room status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// 🔥 prevent duplicate users (extra safety)
roomSchema.methods.addUser = function (userId) {
  if (!this.users.includes(userId)) {
    this.users.push(userId);
  }
};

module.exports = mongoose.model("Room", roomSchema);