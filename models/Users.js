// models/User.js
const mongoose = require("mongoose");

const UsersSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
    },
    password: { type: String, required: true },
    chats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
      },
    ],
    image: {
      type: String, // Store image as a URL or file path
      default: "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.istockphoto.com%2Fphotos%2Fuser-profile&psig=AOvVaw3DTpajCCzaXWAAa1U_Dyxv&ust=1734443825823000&source=images&cd=vfe&opi=89978449&ved=0CBQQjRxqFwoTCNiu_va4rIoDFQAAAAAdAAAAABAE", // Default image URL
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Users", UsersSchema);
