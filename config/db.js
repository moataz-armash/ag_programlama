// config/db.js
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config();
// const ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex"); // 32 bytes as Hex
// console.log("Generated ENCRYPTION_KEY:", ENCRYPTION_KEY);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
