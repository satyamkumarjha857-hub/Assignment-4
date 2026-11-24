const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Note = require('../models/Note');

// RBAC Protected Route: Only accessible to 'admin' role
router.use(verifyToken, authorizeRoles('admin'));

router.get('/dashboard', async (req, res, next) => {
  try {
    const users = await User.find();
    const notes = await Note.find({});
    res.status(200).json({
      message: 'Admin access granted',
      user: req.user,
      stats: {
        totalUsers: users.length,
        totalNotes: notes.length
      },
      users
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
