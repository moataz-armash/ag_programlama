const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const userCRUDs = require("./routes/userCRUD");
const chatRoutes = require("./routes/chat");
const path = require("path");
const crypto = require("crypto");

// Function to encrypt a message
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`; // Combine IV and ciphertext
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust as per your frontend origin
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Serve static files from the "uploads" folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// WebSocket logic
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle joining a chat room
  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`User joined chat: ${chatId}`);
  });

  // Handle sending messages
  socket.on("sendMessage", (data) => {
    const { chatId, senderId, content } = data;

    // Encrypt the message before broadcasting
    const encryptedContent = encrypt(content);

    // Broadcast the encrypted message
    io.to(chatId).emit("receiveMessage", {
      senderId,
      content: encryptedContent,
    });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// API Routes
app.use("/api", authRoutes);
app.use("/api", userCRUDs);
app.use("/api", chatRoutes); // Mount chat routes under '/api/chats'

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
