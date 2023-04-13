const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: "1d"});
}

//Register new User
const registerUser = asyncHandler( async (req, res) => {
    
    const {name, email, password} = req.body;

    //Validation
    if(!name || !email || !password){
        res.status(400);
        throw new Error("Please fill in all the required fields");
    }

    if(password.length < 6){
        res.status(400);
        throw new Error("Password must be atleast 6 characters");
    }
    
    //Checks for same email in already existing accounts
    const userExists = await User.findOne({email});

    if(userExists){
        res.status(400);
        throw new Error("Account already exists for this mail id")
    }

    //Create new User
    const user = await User.create({
        name,
        email,
        password,
    });

    //Generate Token
    const token = generateToken(user._id); 

    //send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 100 * 86400),
        sameSite: "none",
        secure: true,
    });

    console.log('Cookie set:', req.cookies);
   // res.send("cookie send successfully");

    if(user){
        const {_id, name, email, photo, phone, bio} = user
        res.status(201).json({
            _id, name, email, photo, phone, bio, token
        })
    } else {
        res.status(400);
        throw new Error("Invalid User data");
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const {email, password} = req.body;

    if(!email || !password){
        res.status(400);
        throw new Error("Please add email and password");
    }

    const user = await User.findOne({email});

    if(!user){
        res.status(400);
        throw new Error("User not found, Please signup");
    }

    const passwordIsCorrect = await bcrypt.compare(password, user.password);

    const token = generateToken(user._id); 

    //send HTTP-only cookie
    res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 100 * 86400),
        sameSite: "none",
        secure: true,
    });

    if(user && passwordIsCorrect){
        const {_id, name, email, photo, phone, bio} = user
        res.status(201).json({
            _id, name, email, photo, phone, bio, token
        });
    }else{
        res.status(400);
        throw new Error("Invalid email or Password");
    }

});

const logout = asyncHandler(async (req, res) => {
    res.cookie("token", "", {
        path: "/",
        httpOnly: true,
        expires: new Date(0),
        sameSite: "none",
        secure: true,
    });
    return res.status(200).json({ message: "Successfully logged out" });
});

const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if(user){
        const {_id, name, email, photo, phone, bio} = user
        res.status(200).json({
            _id, name, email, photo, phone, bio
        })
    } else {
        res.status(400);
        throw new Error("User not found");
    }
});

const loginStatus = asyncHandler(async (req, res) => {
    const token = req.cookies.token;
   // console.log(token);
    if(!token){
        return res.json(false);
    }
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if(verified){
        return res.json(true);
    }
    return res.json(false);
});

const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if(user){
        const {name, email, photo, phone, bio} = user;
        user.email = email;
        user.name = req.body.name || name;
        user.photo = req.body.photo || photo;
        user.phone = req.body.phone || phone;
        user.bio = req.body.bio || bio;
        
        const updatedUser = await user.save();
        res.status(200).json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            photo: updatedUser.photo,
            phone: updatedUser.phone,
            bio: updatedUser.bio,
        });
    } else{
        res.status(404);
        throw new Error("User not found");
    }
});

const changePassword = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const {oldPassword, password} = req.body;
    
    if(!user){
        res.status(400);
        throw new Error("User not found, Please sign-up");
    }
    
    if(!oldPassword || !password){
        res.status(400);
        throw new Error("Please enter old and new passwords");
    }

    //check if oldPassword matches with the one in DB
    const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

    if(user && passwordIsCorrect){
        user.password = password;
        await user.save();
        res.status(200).send("Password changed successfully");
    } else{
        res.status(400);
        throw new Error("Incorrect password please enter again");
    }
});

const forgotPassword = asyncHandler(async (req, res) => {
    const {email} = req.body;
    //res.send(email);
    const user = await User.findOne({email});

    if(!user){
        res.status(404);
        throw new Error("User not found");
    }

    //delete a token if it already exists in the DB
    let token = await Token.findOne({userId: user._id})
    if(token){
        await token.deleteOne();
    }

    //reset token
    let resetToken = crypto.randomBytes(32).toString("hex") + user._id;
    console.log(resetToken);

    //hash token before saving
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    await new Token({
        userId: user._id,
        token: hashedToken,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * (60 * 1000),
    }).save();

    const resetUrl = process.env.FRONTEND_URL + '/resetpassword/' + resetToken;

    const message = '<h1>Hello ' + user.name + '</h1>' +
                    '<p>Please use the URL below to reset your password</p>' + 
                    '<p>The reset link is valid only for 30 minutes </p>' + 
                    '<a href = ' + resetUrl + 'clicktracking=off>' + resetUrl + '</a>' +
                    '<p>Regards....</p>' + 
                    '<p>Pinvent Team </p>';
    const subject = "Password Reset Request";
    const send_to = user.email;
    const send_from = process.env.EMAIL_USER;

    try {
        //if(!subject || !message || !send_to || !send_to)
        await sendEmail(subject, message, send_to, send_from)
        res.status(200).json({success: true, message: "Reset email send"})
    } catch (error) {
        res.status(500);
        throw new Error({message: error.message});
    }
    
  //  res.send("forgot password");
});

const resetPassword = asyncHandler(async (req, res) => {
    const {password} = req.body;
    const {resetToken} = req.params;

    console.log(resetToken);
    
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const userToken = await Token.findOne({
        token: hashedToken,
        expiresAt: {$gt: Date.now()}
    })

    if(!userToken){
        res.status(404);
        throw new Error("INvalid or Expired Link");
    }

    const user = await User.findOne({_id: userToken.userId})
    user.password = password
    await user.save()
    res.status(200).json({
        message: "Password reset successfull"
    })
});

module.exports = {
    registerUser,
    loginUser,
    logout,
    getUser,
    loginStatus,
    updateUser,
    changePassword,
    forgotPassword,
    resetPassword
};