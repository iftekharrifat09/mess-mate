/**
 * Mess Management System - Backend API
 * 
 * Tech Stack: Node.js, Express, MongoDB (Mongoose), Nodemailer
 * 
 * Setup Instructions:
 * 1. Create a new folder and copy this file
 * 2. Run: npm init -y
 * 3. Run: npm install express mongoose cors bcryptjs jsonwebtoken nodemailer dotenv
 * 4. Create a .env file with:
 *    - MONGO_URI=your_mongodb_atlas_connection_string
 *    - JWT_SECRET=your_jwt_secret_key
 *    - EMAIL_USER=your_gmail_address
 *    - EMAIL_PASS=your_gmail_app_password
 *    - PORT=5000
 * 5. Run: node index.js
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://demoUser:demoPass@cluster0.mongodb.net/messDB';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============================================
// MONGOOSE SCHEMAS & MODELS
// ============================================

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['manager', 'member'], required: true },
  messId: { type: String, default: null },
  emailVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Mess Schema
const messSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  managerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Month Schema
const monthSchema = new mongoose.Schema({
  messId: { type: String, required: true },
  name: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Meal Schema
const mealSchema = new mongoose.Schema({
  oderId: { type: String, required: true },
  monthId: { type: String, required: true },
  date: { type: String, required: true },
  meals: [{
    oderId: String,
    odername: String,
    breakfast: { type: Number, default: 0 },
    lunch: { type: Number, default: 0 },
    dinner: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Deposit Schema
const depositSchema = new mongoose.Schema({
  oderId: { type: String, required: true },
  odername: { type: String, required: true },
  monthId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Meal Cost Schema
const mealCostSchema = new mongoose.Schema({
  oderId: { type: String, required: true },
  odername: { type: String, required: true },
  monthId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Other Cost Schema
const otherCostSchema = new mongoose.Schema({
  monthId: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Join Request Schema
const joinRequestSchema = new mongoose.Schema({
  oderId: { type: String, required: true },
  messId: { type: String, required: true },
  messCode: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Notice Schema
const noticeSchema = new mongoose.Schema({
  messId: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdBy: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Bazar Date Schema
const bazarDateSchema = new mongoose.Schema({
  messId: { type: String, required: true },
  oderId: { type: String, required: true },
  odername: { type: String, required: true },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
  oderId: { type: String, required: true },
  messId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, required: true },
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Note Schema
const noteSchema = new mongoose.Schema({
  messId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// OTP Schema
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  type: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Mess = mongoose.model('Mess', messSchema);
const Month = mongoose.model('Month', monthSchema);
const Meal = mongoose.model('Meal', mealSchema);
const Deposit = mongoose.model('Deposit', depositSchema);
const MealCost = mongoose.model('MealCost', mealCostSchema);
const OtherCost = mongoose.model('OtherCost', otherCostSchema);
const JoinRequest = mongoose.model('JoinRequest', joinRequestSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const BazarDate = mongoose.model('BazarDate', bazarDateSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Note = mongoose.model('Note', noteSchema);
const OTP = mongoose.model('OTP', otpSchema);

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateMessCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueMessCode() {
  let code = generateMessCode();
  let exists = await Mess.findOne({ code });
  while (exists) {
    code = generateMessCode();
    exists = await Mess.findOne({ code });
  }
  return code;
}

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// JWT Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.user = await User.findById(decoded.userId);
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Notify Members Helper
async function notifyMembers(messId, excludeUserId, notification) {
  const members = await User.find({ messId, _id: { $ne: excludeUserId } });
  const notifications = members.map(member => ({
    oderId: member._id.toString(),
    messId,
    ...notification,
    seen: false,
    createdAt: new Date()
  }));
  await Notification.insertMany(notifications);
}

// Notify Manager Helper
async function notifyManager(messId, notification) {
  const mess = await Mess.findById(messId);
  if (mess) {
    await Notification.create({
      oderId: mess.managerId,
      messId,
      ...notification,
      seen: false
    });
  }
}

// ============================================
// AUTH ROUTES
// ============================================

// Register Manager
app.post('/api/auth/register-manager', async (req, res) => {
  try {
    const { name, email, password, messName } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const messCode = await generateUniqueMessCode();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'manager',
      emailVerified: false
    });

    const mess = await Mess.create({
      name: messName,
      code: messCode,
      managerId: user._id.toString()
    });

    user.messId = mess._id.toString();
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        messId: user.messId,
        emailVerified: user.emailVerified
      },
      mess: {
        id: mess._id,
        name: mess.name,
        code: mess.code
      },
      token
    });
  } catch (error) {
    console.error('Register Manager Error:', error);
    res.status(500).json({ success: false, error: 'Failed to register' });
  }
});

// Register Member
app.post('/api/auth/register-member', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'member',
      emailVerified: false
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        messId: user.messId,
        emailVerified: user.emailVerified
      },
      token
    });
  } catch (error) {
    console.error('Register Member Error:', error);
    res.status(500).json({ success: false, error: 'Failed to register' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        messId: user.messId,
        emailVerified: user.emailVerified
      },
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, error: 'Failed to login' });
  }
});

// Get Current User
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        messId: user.messId,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

// Update Profile
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, phone },
      { new: true }
    );
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        messId: user.messId,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Change Password
app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// ============================================
// OTP ROUTES
// ============================================

app.post('/api/send-otp', async (req, res) => {
  try {
    const { type, email } = req.body;

    if (!type || !email) {
      return res.status(400).json({ success: false, error: 'Type and email are required' });
    }

    // Delete existing OTPs for this email and type
    await OTP.deleteMany({ email: email.toLowerCase(), type });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: email.toLowerCase(),
      otp,
      type,
      expiresAt
    });

    let subject = '';
    let html = '';

    switch (type) {
      case 'VERIFY_EMAIL':
        subject = 'Verify Your Email - Mess Manager';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Email Verification</h1>
            <p>Your verification OTP is:</p>
            <h2 style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px;">${otp}</h2>
            <p>This code expires in 10 minutes.</p>
            <p style="color: #6B7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `;
        break;

      case 'CHANGE_EMAIL':
        subject = 'Verify Your New Email - Mess Manager';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Email Change Verification</h1>
            <p>Use this OTP to confirm your new email address:</p>
            <h2 style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px;">${otp}</h2>
            <p>This code expires in 10 minutes.</p>
            <p style="color: #6B7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `;
        break;

      case 'FORGOT_PASSWORD':
        subject = 'Reset Your Password - Mess Manager';
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Password Reset</h1>
            <p>Your password reset OTP is:</p>
            <h2 style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px;">${otp}</h2>
            <p>This code expires in 10 minutes.</p>
            <p style="color: #6B7280; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `;
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid OTP type' });
    }

    await transporter.sendMail({
      from: `"Mess Manager" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('OTP Email Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send OTP email' });
  }
});

app.post('/api/verify-otp', async (req, res) => {
  try {
    const { type, email, otp } = req.body;

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      type,
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    // If verifying email, update user
    if (type === 'VERIFY_EMAIL') {
      await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { emailVerified: true }
      );
    }

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// ============================================
// MESS ROUTES
// ============================================

app.get('/api/mess', authMiddleware, async (req, res) => {
  try {
    const mess = await Mess.findById(req.user.messId);
    res.json({ success: true, mess });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get mess' });
  }
});

app.put('/api/mess', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const mess = await Mess.findByIdAndUpdate(
      req.user.messId,
      { name },
      { new: true }
    );

    // Notify members
    await notifyMembers(req.user.messId, req.userId, {
      title: 'Mess Name Updated',
      message: `Mess name changed to "${name}"`,
      type: 'mess_update'
    });

    res.json({ success: true, mess });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update mess' });
  }
});

app.delete('/api/mess', authMiddleware, async (req, res) => {
  try {
    const messId = req.user.messId;

    // Delete all related data
    await Promise.all([
      User.updateMany({ messId }, { messId: null }),
      Month.deleteMany({ messId }),
      Meal.deleteMany({ messId }),
      Deposit.deleteMany({ messId }),
      MealCost.deleteMany({ messId }),
      OtherCost.deleteMany({ messId }),
      JoinRequest.deleteMany({ messId }),
      Notice.deleteMany({ messId }),
      BazarDate.deleteMany({ messId }),
      Notification.deleteMany({ messId }),
      Note.deleteMany({ messId }),
      Mess.findByIdAndDelete(messId)
    ]);

    res.json({ success: true, message: 'Mess deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete mess' });
  }
});

app.get('/api/mess/members', authMiddleware, async (req, res) => {
  try {
    const members = await User.find({ messId: req.user.messId });
    res.json({
      success: true,
      members: members.map(m => ({
        id: m._id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        role: m.role
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get members' });
  }
});

// ============================================
// MONTH ROUTES
// ============================================

app.get('/api/months', authMiddleware, async (req, res) => {
  try {
    const months = await Month.find({ messId: req.user.messId }).sort({ createdAt: -1 });
    res.json({ success: true, months });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get months' });
  }
});

app.post('/api/months', authMiddleware, async (req, res) => {
  try {
    const { name, startDate } = req.body;

    // Close active months
    await Month.updateMany(
      { messId: req.user.messId, isActive: true },
      { isActive: false, endDate: new Date().toISOString().split('T')[0] }
    );

    const month = await Month.create({
      messId: req.user.messId,
      name,
      startDate,
      isActive: true
    });

    res.json({ success: true, month });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create month' });
  }
});

app.get('/api/months/active', authMiddleware, async (req, res) => {
  try {
    const month = await Month.findOne({ messId: req.user.messId, isActive: true });
    res.json({ success: true, month });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get active month' });
  }
});

// ============================================
// MEAL ROUTES
// ============================================

app.get('/api/meals', authMiddleware, async (req, res) => {
  try {
    const { monthId } = req.query;
    const meals = await Meal.find({ monthId });
    res.json({ success: true, meals });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get meals' });
  }
});

app.post('/api/meals', authMiddleware, async (req, res) => {
  try {
    const { monthId, date, meals } = req.body;

    // Check if meal exists for this date
    let existingMeal = await Meal.findOne({ monthId, date });

    if (existingMeal) {
      existingMeal.meals = meals;
      await existingMeal.save();
    } else {
      existingMeal = await Meal.create({
        oderId: req.userId,
        monthId,
        date,
        meals
      });
    }

    // Notify members
    await notifyMembers(req.user.messId, req.userId, {
      title: 'Meals Updated',
      message: `Meals for ${date} have been updated`,
      type: 'meal_update'
    });

    res.json({ success: true, meal: existingMeal });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save meals' });
  }
});

app.put('/api/meals/:id', authMiddleware, async (req, res) => {
  try {
    const { meals } = req.body;
    const meal = await Meal.findByIdAndUpdate(
      req.params.id,
      { meals },
      { new: true }
    );

    await notifyMembers(req.user.messId, req.userId, {
      title: 'Meals Updated',
      message: `Meals for ${meal.date} have been updated`,
      type: 'meal_update'
    });

    res.json({ success: true, meal });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update meals' });
  }
});

// ============================================
// DEPOSIT ROUTES
// ============================================

app.get('/api/deposits', authMiddleware, async (req, res) => {
  try {
    const { monthId } = req.query;
    const deposits = await Deposit.find({ monthId });
    res.json({ success: true, deposits });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get deposits' });
  }
});

app.post('/api/deposits', authMiddleware, async (req, res) => {
  try {
    const deposit = await Deposit.create(req.body);

    await Notification.create({
      oderId: deposit.oderId,
      messId: req.user.messId,
      title: 'Deposit Added',
      message: `A deposit of ৳${deposit.amount} has been added`,
      type: 'deposit_add',
      seen: false
    });

    res.json({ success: true, deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create deposit' });
  }
});

app.put('/api/deposits/:id', authMiddleware, async (req, res) => {
  try {
    const deposit = await Deposit.findByIdAndUpdate(req.params.id, req.body, { new: true });

    await Notification.create({
      oderId: deposit.oderId,
      messId: req.user.messId,
      title: 'Deposit Updated',
      message: `Your deposit has been updated to ৳${deposit.amount}`,
      type: 'deposit_update',
      seen: false
    });

    res.json({ success: true, deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update deposit' });
  }
});

app.delete('/api/deposits/:id', authMiddleware, async (req, res) => {
  try {
    await Deposit.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deposit deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete deposit' });
  }
});

// ============================================
// MEAL COST ROUTES
// ============================================

app.get('/api/meal-costs', authMiddleware, async (req, res) => {
  try {
    const { monthId } = req.query;
    const costs = await MealCost.find({ monthId });
    res.json({ success: true, costs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get meal costs' });
  }
});

app.post('/api/meal-costs', authMiddleware, async (req, res) => {
  try {
    const { addAsDeposit, ...costData } = req.body;
    const cost = await MealCost.create(costData);

    // If addAsDeposit is true, also create a deposit
    if (addAsDeposit) {
      await Deposit.create({
        oderId: costData.oderId,
        odername: costData.odername,
        monthId: costData.monthId,
        amount: costData.amount,
        date: costData.date,
        note: `Auto-deposit from meal cost: ${costData.description}`
      });
    }

    await Notification.create({
      oderId: cost.oderId,
      messId: req.user.messId,
      title: 'Meal Cost Added',
      message: `A meal cost of ৳${cost.amount} has been added${addAsDeposit ? ' (also added as deposit)' : ''}`,
      type: 'cost_add',
      seen: false
    });

    res.json({ success: true, cost });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create meal cost' });
  }
});

app.put('/api/meal-costs/:id', authMiddleware, async (req, res) => {
  try {
    const cost = await MealCost.findByIdAndUpdate(req.params.id, req.body, { new: true });

    await Notification.create({
      oderId: cost.oderId,
      messId: req.user.messId,
      title: 'Meal Cost Updated',
      message: `Your meal cost has been updated to ৳${cost.amount}`,
      type: 'cost_update',
      seen: false
    });

    res.json({ success: true, cost });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update meal cost' });
  }
});

app.delete('/api/meal-costs/:id', authMiddleware, async (req, res) => {
  try {
    await MealCost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Meal cost deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete meal cost' });
  }
});

// ============================================
// OTHER COST ROUTES
// ============================================

app.get('/api/other-costs', authMiddleware, async (req, res) => {
  try {
    const { monthId } = req.query;
    const costs = await OtherCost.find({ monthId });
    res.json({ success: true, costs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get other costs' });
  }
});

app.post('/api/other-costs', authMiddleware, async (req, res) => {
  try {
    const cost = await OtherCost.create(req.body);

    await notifyMembers(req.user.messId, req.userId, {
      title: 'Other Cost Added',
      message: `A new cost of ৳${cost.amount} has been added: ${cost.description}`,
      type: 'cost_add'
    });

    res.json({ success: true, cost });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create other cost' });
  }
});

app.put('/api/other-costs/:id', authMiddleware, async (req, res) => {
  try {
    const cost = await OtherCost.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, cost });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update other cost' });
  }
});

app.delete('/api/other-costs/:id', authMiddleware, async (req, res) => {
  try {
    await OtherCost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Other cost deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete other cost' });
  }
});

// ============================================
// JOIN REQUEST ROUTES
// ============================================

app.get('/api/join-requests', authMiddleware, async (req, res) => {
  try {
    const requests = await JoinRequest.find({ messId: req.user.messId });
    const populatedRequests = await Promise.all(
      requests.map(async (request) => {
        const user = await User.findById(request.oderId);
        return {
          ...request.toObject(),
          userName: user?.name,
          userEmail: user?.email
        };
      })
    );
    res.json({ success: true, requests: populatedRequests });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get join requests' });
  }
});

app.post('/api/join-requests', authMiddleware, async (req, res) => {
  try {
    const { messCode } = req.body;
    const mess = await Mess.findOne({ code: messCode.toUpperCase() });

    if (!mess) {
      return res.status(400).json({ success: false, error: 'Invalid mess code' });
    }

    const existingRequest = await JoinRequest.findOne({
      oderId: req.userId,
      messId: mess._id.toString(),
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, error: 'Request already pending' });
    }

    const request = await JoinRequest.create({
      oderId: req.userId,
      messId: mess._id.toString(),
      messCode: messCode.toUpperCase()
    });

    // Notify manager
    await notifyManager(mess._id.toString(), {
      title: 'New Join Request',
      message: `${req.user.name} has requested to join your mess`,
      type: 'join_request'
    });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create join request' });
  }
});

app.put('/api/join-requests/:id/approve', authMiddleware, async (req, res) => {
  try {
    const request = await JoinRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true }
    );

    await User.findByIdAndUpdate(request.oderId, { messId: request.messId });

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to approve request' });
  }
});

app.put('/api/join-requests/:id/reject', authMiddleware, async (req, res) => {
  try {
    const request = await JoinRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reject request' });
  }
});

// ============================================
// NOTICE ROUTES
// ============================================

app.get('/api/notices', authMiddleware, async (req, res) => {
  try {
    const notices = await Notice.find({ messId: req.user.messId }).sort({ createdAt: -1 });
    res.json({ success: true, notices });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get notices' });
  }
});

app.get('/api/notices/active', authMiddleware, async (req, res) => {
  try {
    const notice = await Notice.findOne({ messId: req.user.messId, isActive: true });
    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get active notice' });
  }
});

app.post('/api/notices', authMiddleware, async (req, res) => {
  try {
    // Deactivate existing notices
    await Notice.updateMany({ messId: req.user.messId }, { isActive: false });

    const notice = await Notice.create({
      ...req.body,
      messId: req.user.messId,
      createdBy: req.userId,
      isActive: true
    });

    await notifyMembers(req.user.messId, req.userId, {
      title: 'New Notice',
      message: `New notice: ${notice.title}`,
      type: 'notice_add'
    });

    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create notice' });
  }
});

app.put('/api/notices/:id', authMiddleware, async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    await notifyMembers(req.user.messId, req.userId, {
      title: 'Notice Updated',
      message: `Notice "${notice.title}" has been updated`,
      type: 'notice_update'
    });

    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notice' });
  }
});

app.delete('/api/notices/:id', authMiddleware, async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);

    await notifyMembers(req.user.messId, req.userId, {
      title: 'Notice Deleted',
      message: 'A notice has been removed',
      type: 'notice_delete'
    });

    res.json({ success: true, message: 'Notice deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete notice' });
  }
});

// ============================================
// BAZAR DATE ROUTES
// ============================================

app.get('/api/bazar-dates', authMiddleware, async (req, res) => {
  try {
    const dates = await BazarDate.find({ messId: req.user.messId });
    res.json({ success: true, dates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get bazar dates' });
  }
});

app.post('/api/bazar-dates', authMiddleware, async (req, res) => {
  try {
    const { oderId, odername, dates } = req.body;

    // Check for conflicts
    const existingDates = await BazarDate.find({
      messId: req.user.messId,
      date: { $in: dates }
    });

    if (existingDates.length > 0) {
      const conflictDates = existingDates.map(d => d.date).join(', ');
      return res.status(400).json({
        success: false,
        error: `These dates are already assigned: ${conflictDates}`
      });
    }

    const newDates = await BazarDate.insertMany(
      dates.map(date => ({
        messId: req.user.messId,
        oderId,
        odername,
        date
      }))
    );

    await Notification.create({
      oderId,
      messId: req.user.messId,
      title: 'Bazar Dates Assigned',
      message: `You have been assigned bazar duty for: ${dates.join(', ')}`,
      type: 'bazar_date',
      seen: false
    });

    res.json({ success: true, dates: newDates });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create bazar dates' });
  }
});

app.delete('/api/bazar-dates/:id', authMiddleware, async (req, res) => {
  try {
    await BazarDate.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bazar date deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete bazar date' });
  }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ oderId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
});

app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { seen: true },
      { new: true }
    );
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark as read' });
  }
});

app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany({ oderId: req.userId }, { seen: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});

app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete notification' });
  }
});

app.delete('/api/notifications', authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({ oderId: req.userId });
    res.json({ success: true, message: 'All notifications deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete notifications' });
  }
});

// ============================================
// NOTE ROUTES
// ============================================

app.get('/api/notes', authMiddleware, async (req, res) => {
  try {
    const notes = await Note.find({ messId: req.user.messId }).sort({ createdAt: -1 });
    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get notes' });
  }
});

app.post('/api/notes', authMiddleware, async (req, res) => {
  try {
    const note = await Note.create({
      ...req.body,
      messId: req.user.messId,
      createdBy: req.userId
    });

    await notifyMembers(req.user.messId, req.userId, {
      title: 'New Note Added',
      message: `New note: ${note.title}`,
      type: 'note_add'
    });

    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create note' });
  }
});

app.put('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', authMiddleware, async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete note' });
  }
});

// ============================================
// MEMBER MANAGEMENT ROUTES
// ============================================

app.delete('/api/members/:id', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { messId: null });
    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
});
