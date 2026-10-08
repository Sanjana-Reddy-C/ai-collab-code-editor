const mongoose = require("mongoose");

const aiReviewSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    roomId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    aiResponse: {
      type: String,
      required: true,
      trim: true
    },

    reviewType: {
      type: String,
      default: "code-review",
      trim: true
    },

    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed"
    }
  },
  {
    timestamps: true
  }
);

aiReviewSchema.index({
  username: 1,
  createdAt: -1
});

aiReviewSchema.index({
  username: 1,
  roomId: 1,
  createdAt: -1
});

aiReviewSchema.index({
  roomId: 1,
  createdAt: -1
});

module.exports = mongoose.model(
  "AIReview",
  aiReviewSchema
);