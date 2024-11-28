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
module.exports = router;