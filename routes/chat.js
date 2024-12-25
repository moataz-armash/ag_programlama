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


router.post("/start",async (req,res)=>{
  const {userId,otherUserId} = req.body;
  if(!userId || !otherUserId){
    console.log("Both users are required")
    return res.sendStatus(400);
  }
  try {
    let isChat = await Chat.find({
      participants: { $all: [userId, otherUserId] },
    }).populate("participants", "-password");
    if (isChat.length > 0) {
      return res.status(200).json(isChat[0]);
    } else {
      const newChat = new Chat({ participants: [userId, otherUserId] });
      const savedChat = await newChat.save();
      return res.status(201).json(savedChat);
    }
  } catch (error) {
    console.error("Error in /start endpoint:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
})

router.get("/fetch" , async (req, res)=>{
  const {userId} = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  try {
    const chats = await Chat.find({ participants: userId }).populate("participants", "-password");
    return res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return res.status(500).json({ error: "Failed to fetch chats" });
  }
})
router.post("/startgroup", async (req, res) => {
  const { name, participants } = req.body;

  // Validate required fields
  if (!name || !participants) {
    return res.status(400).json({ error: "Missing required fields: 'name' or 'participants'." });
  }

  let parsedParticipants;
  try {
    // Parse the participants field
    parsedParticipants = JSON.parse(participants);
  } catch (error) {
    return res.status(400).json({ error: "Invalid participants format. Must be a valid JSON array." });
  }

  // Validate participants is an array and contains at least 2 IDs
  if (!Array.isArray(parsedParticipants) || parsedParticipants.length < 2) {
    return res.status(400).json({
      error: "Participants must be an array with at least two members (excluding the creator).",
    });
  }

  // Add the creator's userId to the participants array
  const userId = req.body.userId;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Invalid or missing 'userId'." });
  }
  if (!parsedParticipants.includes(userId)) {
    parsedParticipants.push(userId);
  }

  // Validate that the participants array contains at least three unique IDs
  const uniqueParticipants = [...new Set(parsedParticipants)];
  if (uniqueParticipants.length < 3) {
    return res.status(400).json({
      error: "A group must have at least three unique participants, including the creator.",
    });
  }

  console.log("Final participants array:", uniqueParticipants);

  try {
    // Create the group chat
    const newGroupChat = await Chat.create({
      groupName: name,
      isGroup: true,
      participants: uniqueParticipants,
    });

    res.status(201).json({
      message: "Group chat created successfully.",
      groupChat: newGroupChat,
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({
      error: "An error occurred while creating the group chat.",
      details: error.message,
    });
  }
});

router.post("/addparticipant", async (req, res) => {
  const { groupId, userId } = req.body;
  const added = await Chat.findByIdAndUpdate(groupId, { $push: { participants: userId }},{new:true }).
  populate("participants" ,"-password");
  if (!added) {
    return res.status(404).json({ error: "Chat not found" });
  }
  else {
    return res.status(200).json(added);
  }
})
router.put("/removeparticipant", async (req, res) => {
  const { groupId, userId } = req.body;
  const removed = await Chat.findByIdAndUpdate(groupId, { $pull: { participants: userId }},{new:true }).
  populate("participants" ,"-password");
  if (!removed) {
    return res.status(404).json({ error: "Chat not found" });
  }
  else {
    return res.status(200).json(removed);
  }
})

module.exports = router;
