// models/Chat.js
const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    isGroup: {
      type: Boolean,
      default: false, // Defaults to false for individual chats
    },
    groupName: {
      type: String,
      required: function () {
        return this.isGroup; // groupName is required only if isGroup is true
      },
      trim: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
      },
    ],
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", ChatSchema);
