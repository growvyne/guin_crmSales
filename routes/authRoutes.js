const express = require('express');
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware'); /
const { getUsers, updateUserRole, deleteUser } = require('../controllers/userController');

const adminOnly = (req, res, next) =>
  String(req.user?.role || '').toLowerCase() === 'admin'
    ? next()
    : res.status(403).json({ message: 'Admin access only' });

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Admin user-management routes (used by the Users page)
router.get('/users', (req, res, next) => { console.log('users route hit'); next(); }, protect, adminOnly, getUsers);
router.put('/users/:id/role', protect, adminOnly, updateUserRole);
router.delete('/users/:id', protect, adminOnly, deleteUser);

module.exports = router;