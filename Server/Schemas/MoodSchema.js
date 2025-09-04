const mongoose = require('mongoose');

const MoodSchema = new mongoose.Schema({
    id : {
        type: String,
        required: true
    },
    mood: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Mood', MoodSchema);
