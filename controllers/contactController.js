const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");


const contactUs = asyncHandler(async (req, res) => {
    const {subject, message} = req.body;
    const user = await User.findById(req.user._id);

    if(!user){
        res.status(400);
        throw new Error("User not found, please signup");
    }

    if(!subject || !message){
        res.status(400);
        throw new Error("Please add subject and message")
    }

    const send_to = process.env.EMAIL_USER;
    const send_from = process.env.EMAIL_USER;
    const reply_to = user.email;

    try {
        await sendEmail(subject, message, send_to, send_from)
        res.status(200).json({success: true, message: "Email send"})
    } catch (error) {
        res.status(500);
        throw new Error("email not sent please try again");
    }
})

module.exports = {contactUs};