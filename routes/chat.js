const express = require("express");
const Chat = require("../models/Chat");
const User = require("../models/Users");
const crypto = require("crypto");
const router = express.Router();

// Encryption configuration
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex"); // Use a secure key, 32 bytes as a hex string
const IV_LENGTH = 16; // Initialization vector length

// Function to encrypt a message
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`; // Combine IV and ciphertext
}

// Function to decrypt a message
function decrypt(encryptedText) {
  const [iv, encrypted] = encryptedText.split(":"); // Split IV and ciphertext
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    ENCRYPTION_KEY,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
// Start or get a chat
router.post("/start", async (req, res) => {
  const { userId, otherUserId } = req.body;

  try {
    console.log("Starting or retrieving chat:", { userId, otherUserId });

    if (!userId || !otherUserId) {
      return res
        .status(400)
        .json({ error: "Both userId and otherUserId are required." });
    }

    // Check if both users exist
    const user1 = await User.findById(userId);
    const user2 = await User.findById(otherUserId);

    console.log("Users fetched:", {
      user1: user1?.username || "Not Found",
      user2: user2?.username || "Not Found",
    });

    if (!user1 || !user2) {
      return res.status(404).json({ error: "One or both users not found." });
    }

    // Find or create the chat
    let chat = await Chat.findOneAndUpdate(
      { participants: { $all: [userId, otherUserId] } },
      {},
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // If a new chat was created, add to users' chat lists
    if (!chat.__v) {
      // Newly created document has no `__v`
      console.log("Creating a new chat...");
      await User.findByIdAndUpdate(userId, { $push: { chats: chat._id } });
      await User.findByIdAndUpdate(otherUserId, { $push: { chats: chat._id } });
    } else {
      console.log("Existing chat retrieved.");
    }

    // Populate messages
    const populatedChat = await Chat.findById(chat._id).populate({
      path: "messages.sender",
      select: "username email",
    });

    // Decrypt messages safely
    const decryptedMessages = populatedChat.messages.map((message) => {
      try {
        return {
          ...message.toObject(),
          content: decrypt(message.content), // Decrypt content
        };
      } catch (err) {
        console.error("Error decrypting message:", message._id, err.message);
        return message; // Return message without decryption if error occurs
      }
    });

    res.status(200).json({
      ...populatedChat.toObject(),
      messages: decryptedMessages,
    });
  } catch (error) {
    console.error("Error in /start endpoint:", error.message, error.stack);
    res.status(500).json({
      error:
        "An unexpected error occurred while starting or retrieving the chat.",
    });
  }
});

// Add a message to a chat
router.post("/message", async (req, res) => {
  const { chatId, senderId, content } = req.body;

  try {
    // Validate chat existence
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Validate that the sender is a participant of the chat
    if (!chat.participants.includes(senderId)) {
      return res
        .status(403)
        .json({ error: "Sender is not a participant of this chat." });
    }

    // Encrypt the message content
    const encryptedContent = encrypt(content);

    // Create a new message object
    const message = {
      sender: senderId,
      content: encryptedContent, // Store encrypted message
      timestamp: new Date().toISOString(),
    };

    // Add the message to the chat
    chat.messages.push(message);
    await chat.save();

    // Return the encrypted message
    res.status(200).json({
      ...message,
      content: encryptedContent, // Return encrypted content
    });
  } catch (error) {
    console.error("Error in /message endpoint:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while adding the message." });
  }
});
// Get messages for a specific chat with pagination
router.get("/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  let { page = 1, limit = 20 } = req.query;

  try {
    // Validate page and limit
    page = parseInt(page) > 0 ? parseInt(page) : 1;
    limit = parseInt(limit) > 0 ? parseInt(limit) : 20;

    // Find the chat and slice messages for pagination
    const chat = await Chat.findById(chatId)
      .populate({
        path: "messages.sender",
        select: "username email",
      })
      .select({
        messages: { $slice: [(page - 1) * limit, limit] }, // MongoDB slice for pagination
      });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Decrypt messages
    const paginatedMessages = chat.messages.map((message) => {
      try {
        return {
          ...message.toObject(),
          content: decrypt(message.content), // Decrypt content
        };
      } catch (err) {
        console.error("Error decrypting message:", message._id, err.message);
        return message; // Return undecrypted message if error occurs
      }
    });

    // Calculate total message count (separate query to keep pagination efficient)
    const totalMessages = await Chat.aggregate([
      { $match: { _id: chat._id } },
      { $project: { messageCount: { $size: "$messages" } } },
    ]);

    const total = totalMessages[0]?.messageCount || 0;
    const hasMore = page * limit < total;

    // Send response
    res.status(200).json({
      messages: paginatedMessages,
      page,
      limit,
      totalMessages: total,
      hasMore,
    });
  } catch (error) {
    console.error("Error in /:chatId/messages endpoint:", error.message);
    res.status(500).json({ error: "An error occurred while retrieving messages." });
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
