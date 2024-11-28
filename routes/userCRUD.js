//This file is made to add and delete users
const express = require("express");
const User = require("../models/Users");

const router = express.Router();

router.delete("/delete/:user" ,async(req,res)=>{
    const id = req.params.user
    console.log(id)
    try {
        const user = await User.findByIdAndDelete(id);
        return res.json(user)
    } catch (error) {
        console.log("No User found with provided Id")
        return res.json(error)
    }
})
router.post("/addContact/:username",async(req,res)=>{
    const contactUsername = req.params.username;
    // console.log(req.User.username)
    // const userUsername = req.user.username;
    const user = await User.findOne({username: userUsername});
    try {
        // Check if the contact to be added exists by username
        const contact = await User.findOne({ username: contactUsername });
        if (!contact) {
          return res.status(404).json({ message: "Contact not found" });
        }
    
        // Check if the contact is already in the user's contacts list
        if (user.contacts.includes(contactUsername)) {
          return res.status(400).json({ message: "Contact is already in your contact list" });
        }
    
        // Add the contact to the user's contacts list
        user.contacts.push(contactUsername);
        await user.save();
    
        res.status(200).json({ message: "Contact added successfully" });
      } catch (error) {
        console.error("Error adding contact:", error);
        res.status(500).json({ message: "Server error" });
      }
})
module.exports = router;