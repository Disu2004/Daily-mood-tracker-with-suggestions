const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/authController');

router.post('/register', register); // ✅ make sure it's a function
router.post('/login', login);       // ✅ same here
router.post('/logout', logout);
module.exports = router;
