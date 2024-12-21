// routes/auth.js
const express = require("express");
const User = require("../models/Users");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: "./uploads/", // Directory to save images
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Generate a unique filename
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images are allowed."));
    }
  },
});

// Register route
router.post("/register", upload.single("image"), async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Save image path if uploaded
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Create new user
    const newUser = new User({
      username,
      email,
      password,
      image, // Save image path in the user document
    });

    await newUser.save();
    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error("Error in /register:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    if (password !== user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      message:
        "Login successful, username has been saved in local storage successfully: ",
      username: user.username,
      userId: user._id,
      image: user.image,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all usernames route
router.get("/usernames", async (req, res) => {
  try {
    const users = await User.find({}, "username image"); // Only select the username field
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Check if a username exists
router.post("/usernames/check", async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      res.status(200).json({ exists: true, userId: user._id });
    } else {
      res.status(404).json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
