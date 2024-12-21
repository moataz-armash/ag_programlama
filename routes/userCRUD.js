//This file is made to add and delete users
const express = require("express");
const User = require("../models/Users");
const Chat = require("../models/Chat");

const router = express.Router();

router.get("/user/:userId/contacts", async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the user and populate chats with participant details
    const user = await User.findById(userId).populate({
      path: "chats",
      populate: {
        path: "participants",
        select: "username email image", // Fetch only username and email
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract unique contacts (excluding the logged-in user)
    const contacts = user.chats.flatMap((chat) =>
      chat.participants.filter(
        (participant) => participant._id.toString() !== userId
      )
    );

    // Remove duplicate contacts based on their IDs
    const uniqueContacts = Array.from(
      new Map(
        contacts.map((contact) => [contact._id.toString(), contact])
      ).values()
    );

    res.status(200).json(uniqueContacts);
  } catch (error) {
    console.error("Error fetching contacts:", error.message);
    res.status(500).json({ error: "Failed to retrieve contacts." });
  }
});

router.post("/user/add-contact", async (req, res) => {
  const { userId, username } = req.body;

  try {
    // Find the user to add by username
    const otherUser = await User.findOne({ username });

    if (!otherUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userId === otherUser._id.toString()) {
      return res
        .status(400)
        .json({ error: "You cannot add yourself as a contact." });
    }

    // Check if a chat already exists between the users
    let chat = await Chat.findOne({
      participants: { $all: [userId, otherUser._id] },
    });

    if (!chat) {
      // Create a new chat if it doesn't exist
      chat = new Chat({ participants: [userId, otherUser._id] });
      await chat.save();

      // Add the chat to both users
      await User.findByIdAndUpdate(userId, { $push: { chats: chat._id } });
      await User.findByIdAndUpdate(otherUser._id, {
        $push: { chats: chat._id },
      });
    }

    res.status(200).json({ message: "Contact added successfully", chat });
  } catch (error) {
    console.error("Error adding contact:", error.message);
    res.status(500).json({ error: "Failed to add contact." });
  }
});

router.delete("/user/delete-contact", async (req, res) => {
  const { userId, contactId } = req.body;

  try {
    // Find the chat between the two users
    const chat = await Chat.findOneAndDelete({
      participants: { $all: [userId, contactId] },
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat/contact not found." });
    }

    // Remove the chat from both users' chat lists
    await User.findByIdAndUpdate(userId, { $pull: { chats: chat._id } });
    await User.findByIdAndUpdate(contactId, { $pull: { chats: chat._id } });

    res.status(200).json({ message: "Contact deleted successfully." });
  } catch (error) {
    console.error("Error deleting contact:", error.message);
    res.status(500).json({ error: "Failed to delete contact." });
  }
});

router.delete("/delete/:user", async (req, res) => {
  const id = req.params.user;
  console.log(id);
  try {
    const user = await User.findByIdAndDelete(id);
    return res.json(user);
  } catch (error) {
    console.log("No User found with provided Id");
    return res.json(error);
  }
});
module.exports = router;
