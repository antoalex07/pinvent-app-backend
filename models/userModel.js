const mongoose = require("mongoose");
const bcrypt = require("bcryptjs")

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please add a name"]
    },
    email: {
        type: String,
        required: [true, "Please add an email"],
        unique: true,
        trim: true,
        match:[/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, "Please add a valid email"]
    },
    password: {
        type: String,
        required: [true, "Please add a Password"],
        minLength: [6, "Password must contain atleast 6 characters"],
        //maxLength: [23, "Password should not exceed 23 characters"]
    },
    photo: {
        type: String,
        required: [true, "Please add a Photo"],
        default: "http://clevadesk.com/wp-content/uploads/2016/09/products-icon.png"
    },
    phone: {
        type: String,
        default: "+91"
    },
    bio: {
        type: String,
        default: "bio",
        maxLength: [250, "Bio should not exceed more than 250 words"]
    }
},
{
    timestamp: true,
});

userSchema.pre("save", async function(next) {

    if(!this.isModified("password")){
        return next()
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
})

const User = mongoose.model("User", userSchema);

module.exports = User;