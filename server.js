const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const userCRUDs = require("./routes/userCRUD");
const chatRoutes = require("./routes/chat");

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
    io.to(chatId).emit("receiveMessage", { senderId, content });
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
