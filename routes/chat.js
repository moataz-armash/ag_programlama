const express = require("express");
const Chat = require("../models/Chat");
const User = require("../models/Users");
const router = express.Router();

// Start or get a chat
router.post("/start", async (req, res) => {
  const { userId, otherUserId } = req.body;

  try {
    // Check if a chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [userId, otherUserId] },
    });

    if (!chat) {
      // Create a new chat
      chat = new Chat({ participants: [userId, otherUserId] });
      await chat.save();

      // Update user chats
      await User.findByIdAndUpdate(userId, { $push: { chats: chat._id } });
      await User.findByIdAndUpdate(otherUserId, { $push: { chats: chat._id } });
    }

    res.status(200).json(chat); // Return the chat document
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a message to a chat
router.post("/message", async (req, res) => {
  const { chatId, senderId, content } = req.body;

  try {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Validate that sender is a participant
    if (!chat.participants.includes(senderId)) {
      return res
        .status(403)
        .json({ error: "Sender is not a participant of this chat." });
    }

    const message = { sender: senderId, content };
    chat.messages.push(message);
    await chat.save();

    res.status(200).json(message); // Return only the new message
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a specific chat with pagination
router.get("/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    const chat = await Chat.findById(chatId)
      .populate({ path: "messages.sender", select: "username email" })
      .slice("messages", [(page - 1) * limit, limit]);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.status(200).json(chat.messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a user's chats (lightweight)
router.get("/user/:userId/chats", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate({
      path: "chats",
      populate: {
        path: "participants",
        select: "username",
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const chats = user.chats.map((chat) => ({
      chatId: chat._id,
      participants: chat.participants.map((p) => p.username),
    }));

    res.status(200).json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
