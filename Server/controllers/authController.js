const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../Schemas/userSchema');
require('dotenv').config();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || "10");

// ------------------------
// 🔐 Token Helpers
// ------------------------
const createAccessToken = (payload) => {
    return jwt.sign(payload, process.env.ACCESS_SECRET_KEY, { expiresIn: '1d' });
};

const createRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_KEY, { expiresIn: '7d' });
};

// ------------------------
// 📝 Register
// ------------------------
const register = async (req, res) => {
    try {
        const lastUser = await User.findOne().sort({ id: -1 });
        const newId = lastUser ? lastUser.id + 1 : 1;

        const { name, email, password, confpass } = req.body;

        if (!name || !email || !password || !confpass) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confpass) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = new User({
            id: newId,
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();

        const accessToken = createAccessToken({ id: newId });
        const refreshToken = createRefreshToken({ id: newId });

        res.cookie("refreshtoken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/user/refreshtoken",
            sameSite: "strict"
        });

        res.json({
            status: true,
            message: "User registered successfully",
            id: newId,
            accessToken
        });

    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ message: "Registration failed" });
    }
};

// ------------------------
// 🔓 Login
// ------------------------
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const foundUser = await User.findOne({ email });
        if (!foundUser) {
            return res.status(404).json({ message: "Email not registered!" });
        }

        const isMatch = await bcrypt.compare(password, foundUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const accessToken = createAccessToken({ id: foundUser.id });
        const refreshToken = createRefreshToken({ id: foundUser.id });

        res.cookie("refreshtoken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            path: "/user/refreshtoken",
            sameSite: "strict"
        });

        res.json({
            message: "Login successful",
            id: foundUser.id,
            accessToken
        });

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ------------------------
// 🔄 Refresh Token
// ------------------------
const refreshToken = (req, res) => {
    try {
        const rf_token = req.cookies.refreshtoken;
        if (!rf_token) return res.status(401).json({ message: "No refresh token provided" });

        jwt.verify(rf_token, process.env.REFRESH_TOKEN_KEY, (err, decoded) => {
            if (err) return res.status(403).json({ message: "Invalid refresh token" });

            const accessToken = createAccessToken({ id: decoded.id });
            res.json({ accessToken });
        });
    } catch (err) {
        console.error("Refresh token error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// ------------------------
// 🚪 Logout
// ------------------------
const logout = (req, res) => {
    try {
        res.clearCookie("refreshtoken", { path: "/user/refreshtoken" });
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Server error" });
    }
};



// ------------------------
// 📦 Export
// ------------------------
module.exports = {
    register,
    login,
    refreshToken,
    logout
};
