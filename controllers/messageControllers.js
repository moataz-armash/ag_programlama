const asyncHandler = require("express-async-handler");
const Message = require("../Models/messageModel");
const User = require("../Models/userModel");
const Chat = require("../Models/chatModel");
const CryptoJS = require("crypto-js");

// Secret key used for encryption and decryption (should be securely handled)
const secretKey = process.env.SECRET_KEY || "your-secret-key";

// Encrypt function using CryptoJS AES
const encryptMessage = (messageContent) => {
  return CryptoJS.AES.encrypt(messageContent, secretKey).toString(); // Encrypt the content
};

// Decrypt function using CryptoJS AES
const decryptMessage = (encryptedContent) => {
  const bytes = CryptoJS.AES.decrypt(encryptedContent, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8); // Convert bytes to utf8 string (original content)
};

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  const encryptedContent = encryptMessage(content); // Encrypt the message content

  var newMessage = {
    sender: req.user._id,
    content: encryptedContent, // Save encrypted content
    chat: chatId,
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name pic email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message,
    });

    // Decrypt message content before returning to the frontend
    message.content = decryptMessage(message.content); // Decrypt the content

    res.json(message); // Return decrypted message
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const allMessages = asyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name pic email")
      .populate("chat");

    // Decrypt message content before sending to the client
    const decryptedMessages = messages.map((message) => {
      message.content = decryptMessage(message.content); // Decrypt the content
      return message;
    });

    res.json(decryptedMessages); // Send decrypted messages to the client
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { sendMessage, allMessages };
