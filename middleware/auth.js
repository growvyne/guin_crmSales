// Use this ONLY if you don't already have a working protect middleware.
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Checks the "Authorization: Bearer <token>" header and sets req.user
exports.protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id || decoded._id || decoded.userId).select("-password");

    if (!user) return res.status(401).json({ message: "User no longer exists" });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// Allows only admins
exports.adminOnly = (req, res, next) =>
  String(req.user?.role || "").toLowerCase() === "admin"
    ? next()
    : res.status(403).json({ message: "Admin access only" });