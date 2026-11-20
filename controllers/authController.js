const User = require('../models/User');
const Lead = require("../models/Lead");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


const sameId = (a, b) => String(a) === String(b);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
})

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Register User or Admin
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'user'
        });

        res.status(201).json({
            message: 'User registered successfully',
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Login User or Admin
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

        res.json({
            message: 'Login successful',
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User with this email does not exist.' });

        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Use environment variable for frontend URL (fallback to localhost for dev)
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const resetUrl = `${clientUrl}/reset-password/${token}`;

        const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'SalesCRM - Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Password Reset Request</h2>
                    <p>You requested a password reset for your SalesCRM account. Click the button below to proceed:</p>
                    <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reset Password</a>
                    <p style="margin-top: 20px; color: #666;">If you didn't request this, please ignore this email. This link expires in 1 hour.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Password reset link sent to your email.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong, please try again.' });
    }
};

// 2. Reset Password - Save New Password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() } // Check if token is not expired
        });

        if (!user) return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password has been successfully updated.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reset password.' });
    }
};

// GET /api/users  (admin) -> users + how many leads each one owns
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    const counts = await Lead.aggregate([{ $group: { _id: "$user", count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    res.json(users.map((u) => ({ ...u, leadCount: countMap.get(String(u._id)) || 0 })));
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not load users" });
  }
};

// PUT /api/users/:id/role  (admin)
exports.updateUserRole = async (req, res) => {
  try {
    const role = String(req.body.role || "").toLowerCase();
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Role must be admin or user" });
    }
    if (sameId(req.params.id, req.user._id || req.user.id)) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not update role" });
  }
};

// DELETE /api/users/:id  (admin)
exports.deleteUser = async (req, res) => {
  try {
    if (sameId(req.params.id, req.user._id || req.user.id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not delete user" });
  }
};

// PUT /api/auth/users/:id  (admin) -> edit a user's profile
// Body: { name, email, role, password }  (every field optional)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isSelf = sameId(user._id, req.user._id || req.user.id);
    const update = {};

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ message: "Name cannot be empty" });
      update.name = String(name).trim();
    }

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        return res.status(400).json({ message: "Enter a valid email address" });
      }
      const taken = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ message: "That email is already in use" });
      update.email = cleanEmail;
    }

    if (role !== undefined) {
      const cleanRole = String(role).toLowerCase();
      if (!["admin", "user"].includes(cleanRole)) {
        return res.status(400).json({ message: "Role must be admin or user" });
      }
      if (isSelf && cleanRole !== String(user.role).toLowerCase()) {
        return res.status(400).json({ message: "You cannot change your own role" });
      }
      update.role = cleanRole;
    }

    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      // Hash here and update directly, so it works whether or not your model has a pre('save') hook
      update.password = await bcrypt.hash(String(password), 10);
    }

    // findByIdAndUpdate skips save-hooks, so existing passwords are never re-hashed by mistake
    const updated = await User.findByIdAndUpdate(user._id, update, { new: true }).select("-password");
    res.json(updated);
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ message: err.message || "Could not update user" });
  }
};
