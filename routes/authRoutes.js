const express = require('express');
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const { protect } = require('../middleware/auth'); 
const { getUsers, updateUserRole, deleteUser,updateUser } = require('../controllers/authController');

const adminOnly = (req, res, next) =>
  String(req.user?.role || '').toLowerCase() === 'admin'
    ? next()
    : res.status(403).json({ message: 'Admin access only' });

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Admin user-management routes
router.get('/users', protect, adminOnly, getUsers);
router.put('/users/:id', protect, adminOnly, updateUser);          // edit profile (name, email, role, password)
router.put('/users/:id/role', protect, adminOnly, updateUserRole); // quick role change
router.delete('/users/:id', protect, adminOnly, deleteUser);

module.exports = router;