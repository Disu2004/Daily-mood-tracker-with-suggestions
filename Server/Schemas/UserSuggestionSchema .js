const { default: mongoose } = require("mongoose");

const UserSuggestionSchema = new mongoose.Schema({
    userId: {
        type: Number, // reference to User collection
        required: true
    },
    mood: {
        type: String, // e.g., "happy", "sad", "angry"
        required: true
    },
    suggestion: {
        type: String, // what the user actually selected
        required: true
    }
}, { timestamps: true });

const UserSuggestion = mongoose.model("UserSuggestion", UserSuggestionSchema);

module.exports = UserSuggestion;
