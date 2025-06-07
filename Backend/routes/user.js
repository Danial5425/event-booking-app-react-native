import express from "express";
import bcrypt from "bcrypt";
import { User } from "../Models/User.js";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/auth.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
// Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role, secretCode } = req.body;

    if (role === "admin" && secretCode !== "Admin@0032") {
      return res.status(400).json({
        status: false,
        message: "Invalid secret code for admin registration",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ status: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: username,
      email,
      password: hashedPassword,
      role: role || "customer",
    });

    await newUser.save();

    return res.json({ status: true, message: "User created" });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ status: false, message: "User is not registered" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ status: false, message: "Password is incorrect" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.KEY, {
      expiresIn: "1h",
    });

    res.cookie("jwt", token, {
      maxAge: 3600000,
      httpOnly: true,
      secure: false, // true in production with HTTPS
    });

    return res.json({
      status: true,
      message: "Login successfully",
      token,
      _id: user._id,
      role: user.role, // if you want to navigate based on role
    });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user)
      return res.status(404).json({ status: false, message: "User not found" });
    return res.json({ status: true, user });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

// Update profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      mobile,
      address,
      bio,
      profileImage,
      dateOfBirth,
      gender,
      role,
      age,
      interests,
    } = req.body; // ✅ Destructure all fields properly

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        name,
        mobile,
        address,
        bio,
        profileImage,
        dateOfBirth,
        gender,
        role,
        age,
        interests,
        updatedAt: Date.now(),
      },
      { new: true }
    ).select("-password");

    return res.json({ status: true, user: updatedUser });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Generate OTP and expiration time (5 minutes from now)
    const otp = generateOTP();
    const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);

    // Save OTP to user document
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = otpExpiration;
    await user.save();

    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}\nThis OTP will expire in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      status: true, 
      message: 'OTP sent to your email',
      email: email // Return email for verification step
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ status: false, message: 'User not found' });
    }

    // Compare OTP and ensure both are treated as strings
    if (String(user.resetPasswordOTP).trim() !== String(otp).trim()) {
      return res.status(400).json({ status: false, message: 'Incorrect OTP' });
    }

    // Check OTP expiration
    if (user.resetPasswordOTPExpires < Date.now()) {
      return res.status(400).json({ status: false, message: 'OTP has expired' });
    }

    // Generate a temporary token for password reset (valid for 10 minutes)
    const tempToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.KEY,
      { expiresIn: '10m' }
    );

    res.json({
      status: true,
      message: 'OTP verified successfully',
      tempToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});


// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { tempToken, newPassword } = req.body;
    
    // Verify the temporary token
    const decoded = jwt.verify(tempToken, process.env.KEY);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear OTP fields
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    res.json({ 
      status: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: false, message: 'Token has expired' });
    }
    res.status(500).json({ status: false, message: 'Server error' });
  }
});

// Get all users (Admin only)
router.get("/all-users", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ status: false, message: "Unauthorized access" });
    }

    const users = await User.find().select("-password");
    return res.json({ status: true, users });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

// Update user by ID (Admin only)
router.put("/update-user/:userId", authenticateToken, async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ status: false, message: "Unauthorized access" });
    }

    const { userId } = req.params;
    const updateData = req.body;

    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.role;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: Date.now() },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    return res.json({ status: true, user: updatedUser });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

// Delete user (Admin only)
router.delete("/delete-user/:userId", authenticateToken, async (req, res) => {
  try {
    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ status: false, message: "Unauthorized access" });
    }

    const { userId } = req.params;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    return res.json({ status: true, message: "User deleted successfully" });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

export default router;
