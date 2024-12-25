const express = require("express");
const Chat = require("../models/Chat");
const mongoose = require("mongoose");
const router = express.Router();

// Sending a message
router.post("/sendmessage", async (req, res) => {
    const { sender, chatId, message } = req.body;

    // Validate request body
    if (!sender || !message || !chatId) {
        return res.status(400).json({ message: "Please fill all the fields" });
    }

    // Validate chatId format
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chat ID" });
    }

    try {
        // Check if the chat exists
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Create the new message object
        const newMessage = {
            sender: sender,
            content: message, // Ensure the key matches the schema
            timestamp: new Date(),
        };

        // Push the message into the chat's messages array
        chat.messages.push(newMessage);
        await chat.save();

        res.status(200).json({
            message: "Message sent successfully",
            chat: chat,
        });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: error.message });
    }
    // could use here populate if needed
});


//fetching messages
router.get("/fetchmessages", async (req, res) => {
    const { chatId } = req.body;

    if (!chatId) {
        return res.status(400).json({ message: "Chat ID is required" });
    }

    // Validate chatId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chat ID" });
    }

    try {
        // Find the chat by ID
        const chat = await Chat.findById(chatId)
            .populate("messages.sender", "name email") // Populate sender details (optional)
            .select("messages"); // Only fetch the messages field

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Return the messages
        res.status(200).json({
            messages: chat.messages,
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
