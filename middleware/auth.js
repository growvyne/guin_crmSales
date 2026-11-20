const jwt = require('jsonwebtoken');
const User = require('../models/User'); // adjust path if needed

// ======================
// verifyToken (simple)
// ======================
const verifyToken = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided. Access denied.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request
    req.user = decoded; // usually contains { id, role, ... }

    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ======================
// protect (more advanced - also loads user from DB)
// ======================
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token (without password)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
};

// ======================
// Admin only middleware (optional but recommended)
// ======================
const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.isAdmin)) {
    next();
  } else {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
};

module.exports = { protect, verifyToken, adminOnly };