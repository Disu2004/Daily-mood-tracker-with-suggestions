require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require('./routes/authRoutes');
const moodRoutes = require('./routes/moodRoutes');
const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGODB_URI;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: "http://localhost:5173",   // your React frontend URL
  credentials: true
}));


// MongoDB Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

// Route Mounting
app.use('/', authRoutes);

app.use('/api', moodRoutes);


app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
