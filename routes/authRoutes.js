const express = require('express');
const router = express.Router();

const {
  register,
  login,
  forgotPassword,
  resetPassword,
  adminCreateUser,
  getUserStats
} = require('../controllers/authController');

const { protect,verifyToken } = require('../middleware/auth'); 
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
router.post("/create-user", verifyToken, adminCreateUser);
router.get("/user-stats", verifyToken, getUserStats);
router.get('/users', protect, adminOnly, getUsers);
router.put('/users/:id', protect, adminOnly, updateUser);          
router.put('/users/:id/role', protect, adminOnly, updateUserRole); 
router.delete('/users/:id', protect, adminOnly, deleteUser);

module.exports = router;