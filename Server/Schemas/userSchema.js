    const { default: mongoose } = require("mongoose");

const userSchema = mongoose.Schema({
    id : {
        type : Number,
        required : true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    confpass: {
        type: String
    }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
