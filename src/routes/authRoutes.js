const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public auth endpoints
router.post('/signup', signup);
router.post('/login', login);

// Protected user profile
router.get('/me', verifyToken, getMe);

module.exports = router;
