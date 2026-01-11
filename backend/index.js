/**
 * Mess Management System - Backend API
 *
 * Tech Stack: Node.js, Express, MongoDB (Native Driver), Nodemailer
 *
 * Setup Instructions:
 * 1. Create a new folder and copy this file
 * 2. Run: npm init -y
 * 3. Run: npm install express mongodb cors bcryptjs jsonwebtoken nodemailer dotenv
 * 4. Create a .env file with:
 *    - MONGO_URI=your_mongodb_atlas_connection_string
 *    - JWT_SECRET=your_jwt_secret_key
 *    - EMAIL_USER=your_gmail_address
 *    - EMAIL_PASS=your_gmail_app_password
 *    - PORT=5000
 * 5. Run: node index.js
 */

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/messDB";
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";
const PORT = process.env.PORT || 5000;

let db;
let collections = {};
let mongoDbConnected = false;

// Helper to transform MongoDB document to frontend format
function transformDoc(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

function transformDocs(docs) {
  return docs.map(transformDoc);
}

// Connect to MongoDB
async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log("✅ MongoDB Connected Successfully");
    mongoDbConnected = true;

    db = client.db("messDB");

    // Initialize collections
    collections = {
      users: db.collection("users"),
      messes: db.collection("messes"),
      months: db.collection("months"),
      meals: db.collection("meals"),
      deposits: db.collection("deposits"),
      mealCosts: db.collection("mealCosts"),
      otherCosts: db.collection("otherCosts"),
      joinRequests: db.collection("joinRequests"),
      notices: db.collection("notices"),
      bazarDates: db.collection("bazarDates"),
      notifications: db.collection("notifications"),
      notes: db.collection("notes"),
      otps: db.collection("otps"),
    };

    // Create indexes
    await Promise.all([
      collections.users.createIndex({ email: 1 }, { unique: true }),
      collections.messes.createIndex({ code: 1 }, { unique: true }),
      collections.messes.createIndex({ managerId: 1 }),
      collections.users.createIndex({ messId: 1 }),
      collections.months.createIndex({ messId: 1 }),
      collections.meals.createIndex({ monthId: 1 }),
      collections.meals.createIndex({ date: 1 }),
      collections.deposits.createIndex({ monthId: 1 }),
      collections.deposits.createIndex({ userId: 1 }),
      collections.mealCosts.createIndex({ monthId: 1 }),
      collections.mealCosts.createIndex({ userId: 1 }),
      collections.otherCosts.createIndex({ monthId: 1 }),
      collections.joinRequests.createIndex({ messId: 1 }),
      collections.joinRequests.createIndex({ userId: 1 }),
      collections.notices.createIndex({ messId: 1 }),
      collections.bazarDates.createIndex({ messId: 1 }),
      collections.notifications.createIndex({ userId: 1 }),
      collections.notes.createIndex({ messId: 1 }),
      collections.otps.createIndex({ email: 1 }),
      collections.otps.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateMessCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueMessCode() {
  let code = generateMessCode();
  let exists = await collections.messes.findOne({ code });
  while (exists) {
    code = generateMessCode();
    exists = await collections.messes.findOne({ code });
  }
  return code;
}

// Email Transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// JWT Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, error: "No token provided" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.user = await collections.users.findOne({
      _id: new ObjectId(decoded.userId),
    });
    if (!req.user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};

// Notify Members Helper
async function notifyMembers(messId, excludeUserId, notification) {
  const members = await collections.users
    .find({
      messId,
      _id: { $ne: new ObjectId(excludeUserId) },
    })
    .toArray();

  const notifications = members.map((member) => ({
    userId: member._id.toString(),
    messId,
    ...notification,
    seen: false,
    createdAt: new Date(),
  }));

  if (notifications.length > 0) {
    await collections.notifications.insertMany(notifications);
  }
}

// Notify Manager Helper
async function notifyManager(messId, notification) {
  const mess = await collections.messes.findOne({ _id: new ObjectId(messId) });
  if (mess) {
    await collections.notifications.insertOne({
      userId: mess.managerId,
      messId,
      ...notification,
      seen: false,
      createdAt: new Date(),
    });
  }
}

// ============================================
// AUTH ROUTES
// ============================================

// Register Manager
app.post("/api/auth/register-manager", async (req, res) => {
  try {
    const { name, email, password, messName, phone } = req.body;

    const existingUser = await collections.users.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const messCode = await generateUniqueMessCode();

    const userResult = await collections.users.insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || "",
      role: "manager",
      messId: null,
      isApproved: true,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
    });

    const messResult = await collections.messes.insertOne({
      name: messName,
      code: messCode,
      managerId: userResult.insertedId.toString(),
      createdAt: new Date(),
    });

    await collections.users.updateOne(
      { _id: userResult.insertedId },
      { $set: { messId: messResult.insertedId.toString() } }
    );

    // Create initial month
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    await collections.months.insertOne({
      messId: messResult.insertedId.toString(),
      name: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      startDate: now.toISOString().split('T')[0],
      endDate: null,
      isActive: true,
      createdAt: new Date(),
    });

    const token = jwt.sign(
      { userId: userResult.insertedId.toString() },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      user: {
        id: userResult.insertedId.toString(),
        name,
        email: email.toLowerCase(),
        phone: phone || "",
        role: "manager",
        messId: messResult.insertedId.toString(),
        isApproved: true,
        isActive: true,
        emailVerified: false,
      },
      mess: {
        id: messResult.insertedId.toString(),
        name: messName,
        code: messCode,
      },
      token,
    });
  } catch (error) {
    console.error("Register Manager Error:", error);
    res.status(500).json({ success: false, error: "Failed to register" });
  }
});

// Register Member
app.post("/api/auth/register-member", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await collections.users.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await collections.users.insertOne({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone || "",
      role: "member",
      messId: null,
      isApproved: false,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
    });

    const token = jwt.sign(
      { userId: userResult.insertedId.toString() },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      user: {
        id: userResult.insertedId.toString(),
        name,
        email: email.toLowerCase(),
        phone: phone || "",
        role: "member",
        messId: null,
        isApproved: false,
        isActive: true,
        emailVerified: false,
      },
      token,
    });
  } catch (error) {
    console.error("Register Member Error:", error);
    res.status(500).json({ success: false, error: "Failed to register" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await collections.users.findOne({
      email: email.toLowerCase(),
    });
    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(400).json({ success: false, error: "Your account has been deactivated" });
    }

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        messId: user.messId,
        isApproved: user.isApproved !== false,
        isActive: user.isActive !== false,
        emailVerified: user.emailVerified || false,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, error: "Failed to login" });
  }
});

// Get Current User
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        messId: user.messId,
        isApproved: user.isApproved !== false,
        isActive: user.isActive !== false,
        emailVerified: user.emailVerified || false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get user" });
  }
});

// Update Profile
app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await collections.users.updateOne(
      { _id: new ObjectId(req.userId) },
      { $set: { name, phone } }
    );

    const user = await collections.users.findOne({
      _id: new ObjectId(req.userId),
    });

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        messId: user.messId,
        isApproved: user.isApproved !== false,
        isActive: user.isActive !== false,
        emailVerified: user.emailVerified || false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
});

// Change Password
app.put("/api/auth/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await collections.users.findOne({
      _id: new ObjectId(req.userId),
    });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await collections.users.updateOne(
      { _id: new ObjectId(req.userId) },
      { $set: { password: hashedPassword } }
    );

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to change password" });
  }
});

// ============================================
// OTP ROUTES
// ============================================

app.post("/api/send-otp", async (req, res) => {
  try {
    const { type, email } = req.body;

    if (!type || !email) {
      return res.status(400).json({ success: false, error: "Type and email are required" });
    }

    await collections.otps.deleteMany({ email: email.toLowerCase(), type });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await collections.otps.insertOne({
      email: email.toLowerCase(),
      otp,
      type,
      expiresAt,
      createdAt: new Date(),
    });

    let subject = "";
    let html = "";

    switch (type) {
      case "VERIFY_EMAIL":
        subject = "Verify Your Email - Mess Manager";
        html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Email Verification</h1>
          <p>Your verification OTP is:</p>
          <h2 style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px;">${otp}</h2>
          <p>This code expires in 10 minutes.</p>
        </div>`;
        break;

      case "CHANGE_EMAIL":
        subject = "Verify Your New Email - Mess Manager";
        html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Email Change Verification</h1>
          <p>Use this OTP to confirm your new email address:</p>
          <h2 style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px;">${otp}</h2>
          <p>This code expires in 10 minutes.</p>
        </div>`;
        break;

      case "FORGOT_PASSWORD":
        subject = "Reset Your Password - Mess Manager";
        html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Password Reset</h1>
          <p>Your password reset OTP is:</p>
          <h2 style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px;">${otp}</h2>
          <p>This code expires in 10 minutes.</p>
        </div>`;
        break;

      default:
        return res.status(400).json({ success: false, error: "Invalid OTP type" });
    }

    await transporter.sendMail({
      from: `"Mess Manager" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("OTP Email Error:", error);
    res.status(500).json({ success: false, error: "Failed to send OTP email" });
  }
});

app.post("/api/verify-otp", async (req, res) => {
  try {
    const { type, email, otp } = req.body;

    const otpRecord = await collections.otps.findOne({
      email: email.toLowerCase(),
      type,
      otp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, error: "Invalid or expired OTP" });
    }

    await collections.otps.deleteOne({ _id: otpRecord._id });

    if (type === "VERIFY_EMAIL") {
      await collections.users.updateOne(
        { email: email.toLowerCase() },
        { $set: { emailVerified: true } }
      );
    }

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to verify OTP" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await collections.users.findOne({
      email: email.toLowerCase(),
    });
    if (!user) {
      return res.status(400).json({ success: false, error: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await collections.users.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
});

// ============================================
// USER ROUTES
// ============================================

app.get("/api/users/:id", authMiddleware, async (req, res) => {
  try {
    const user = await collections.users.findOne({ _id: new ObjectId(req.params.id) });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        messId: user.messId,
        isApproved: user.isApproved !== false,
        isActive: user.isActive !== false,
        emailVerified: user.emailVerified || false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get user" });
  }
});

// ============================================
// MESS ROUTES
// ============================================

app.get("/api/mess", authMiddleware, async (req, res) => {
  try {
    if (!req.user.messId) {
      return res.json({ success: true, mess: null });
    }
    const mess = await collections.messes.findOne({
      _id: new ObjectId(req.user.messId),
    });
    res.json({ success: true, mess: transformDoc(mess) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get mess" });
  }
});

app.get("/api/mess/:id", authMiddleware, async (req, res) => {
  try {
    const mess = await collections.messes.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.json({ success: true, mess: transformDoc(mess) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get mess" });
  }
});

app.get("/api/mess/code/:code", async (req, res) => {
  try {
    const mess = await collections.messes.findOne({
      code: req.params.code.toUpperCase(),
    });
    if (!mess) {
      return res.status(404).json({ success: false, error: "Mess not found" });
    }
    res.json({
      success: true,
      mess: {
        id: mess._id.toString(),
        name: mess.name,
        code: mess.code,
        messCode: mess.code,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to search mess" });
  }
});

app.get("/api/mess/search/:query", async (req, res) => {
  try {
    const query = req.params.query;
    const messes = await collections.messes
      .find({
        $or: [
          { code: { $regex: query, $options: "i" } },
          { name: { $regex: query, $options: "i" } },
        ],
      })
      .toArray();
    
    res.json({
      success: true,
      messes: messes.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        code: m.code,
        messCode: m.code,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to search messes" });
  }
});

app.put("/api/mess", authMiddleware, async (req, res) => {
  try {
    const { name, code } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code.toUpperCase();

    await collections.messes.updateOne(
      { _id: new ObjectId(req.user.messId) },
      { $set: updateData }
    );

    const mess = await collections.messes.findOne({
      _id: new ObjectId(req.user.messId),
    });

    await notifyMembers(req.user.messId, req.userId, {
      title: "Mess Updated",
      message: name ? `Mess name changed to "${name}"` : "Mess code has been updated",
      type: "mess_update",
    });

    res.json({ success: true, mess: transformDoc(mess) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update mess" });
  }
});

app.delete("/api/mess", authMiddleware, async (req, res) => {
  try {
    const messId = req.user.messId;
    const messObjectId = new ObjectId(messId);

    await Promise.all([
      collections.users.updateMany({ messId }, { $set: { messId: null } }),
      collections.months.deleteMany({ messId }),
      collections.meals.deleteMany({ messId }),
      collections.deposits.deleteMany({ messId }),
      collections.mealCosts.deleteMany({ messId }),
      collections.otherCosts.deleteMany({ messId }),
      collections.joinRequests.deleteMany({ messId }),
      collections.notices.deleteMany({ messId }),
      collections.bazarDates.deleteMany({ messId }),
      collections.notifications.deleteMany({ messId }),
      collections.notes.deleteMany({ messId }),
      collections.messes.deleteOne({ _id: messObjectId }),
    ]);

    res.json({ success: true, message: "Mess deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete mess" });
  }
});

app.get("/api/mess/members", authMiddleware, async (req, res) => {
  try {
    const members = await collections.users
      .find({ messId: req.user.messId, isActive: { $ne: false } })
      .toArray();
    res.json({
      success: true,
      members: members.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        fullName: m.name,
        email: m.email,
        phone: m.phone || "",
        role: m.role,
        messId: m.messId,
        isApproved: m.isApproved !== false,
        isActive: m.isActive !== false,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get members" });
  }
});

// ============================================
// MONTH ROUTES
// ============================================

app.get("/api/months", authMiddleware, async (req, res) => {
  try {
    const months = await collections.months
      .find({ messId: req.user.messId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, months: transformDocs(months) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get months" });
  }
});

app.post("/api/months", authMiddleware, async (req, res) => {
  try {
    const { name, startDate, year, month } = req.body;

    await collections.months.updateMany(
      { messId: req.user.messId, isActive: true },
      {
        $set: {
          isActive: false,
          endDate: new Date().toISOString().split("T")[0],
        },
      }
    );

    const monthDoc = {
      messId: req.user.messId,
      name,
      startDate,
      year: year || new Date().getFullYear(),
      month: month || new Date().getMonth() + 1,
      endDate: null,
      isActive: true,
      createdAt: new Date(),
    };

    const result = await collections.months.insertOne(monthDoc);

    res.json({ success: true, month: { id: result.insertedId.toString(), ...monthDoc } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create month" });
  }
});

app.get("/api/months/active", authMiddleware, async (req, res) => {
  try {
    const month = await collections.months.findOne({
      messId: req.user.messId,
      isActive: true,
    });
    res.json({ success: true, month: transformDoc(month) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get active month" });
  }
});

app.put("/api/months/:id", authMiddleware, async (req, res) => {
  try {
    const { isActive, ...updates } = req.body;
    
    if (isActive === true) {
      await collections.months.updateMany(
        { messId: req.user.messId, isActive: true },
        { $set: { isActive: false, endDate: new Date().toISOString().split("T")[0] } }
      );
    }

    await collections.months.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...updates, isActive: isActive !== undefined ? isActive : undefined } }
    );

    const month = await collections.months.findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, month: transformDoc(month) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update month" });
  }
});

// ============================================
// MEAL ROUTES
// ============================================

app.get("/api/meals", authMiddleware, async (req, res) => {
  try {
    const { monthId } = req.query;
    const meals = await collections.meals.find({ monthId }).toArray();
    res.json({ success: true, meals: transformDocs(meals) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get meals" });
  }
});

app.post("/api/meals", authMiddleware, async (req, res) => {
  try {
    const { monthId, userId, date, breakfast, lunch, dinner } = req.body;

    let existingMeal = await collections.meals.findOne({ monthId, userId, date });

    if (existingMeal) {
      await collections.meals.updateOne(
        { _id: existingMeal._id },
        { $set: { breakfast, lunch, dinner } }
      );
      existingMeal = await collections.meals.findOne({ _id: existingMeal._id });
    } else {
      const result = await collections.meals.insertOne({
        userId,
        monthId,
        messId: req.user.messId,
        date,
        breakfast: breakfast || 0,
        lunch: lunch || 0,
        dinner: dinner || 0,
        createdAt: new Date(),
      });
      existingMeal = await collections.meals.findOne({ _id: result.insertedId });
    }

    res.json({ success: true, meal: transformDoc(existingMeal) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to save meals" });
  }
});

app.put("/api/meals/:id", authMiddleware, async (req, res) => {
  try {
    const { breakfast, lunch, dinner } = req.body;
    await collections.meals.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { breakfast, lunch, dinner } }
    );

    const meal = await collections.meals.findOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, meal: transformDoc(meal) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update meals" });
  }
});

app.delete("/api/meals/:id", authMiddleware, async (req, res) => {
  try {
    await collections.meals.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Meal deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete meal" });
  }
});

// ============================================
// DEPOSIT ROUTES
// ============================================

app.get("/api/deposits", authMiddleware, async (req, res) => {
  try {
    const { monthId } = req.query;
    const deposits = await collections.deposits.find({ monthId }).toArray();
    res.json({ success: true, deposits: transformDocs(deposits) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get deposits" });
  }
});

app.post("/api/deposits", authMiddleware, async (req, res) => {
  try {
    const { monthId, userId, amount, date, note } = req.body;
    
    const deposit = {
      monthId,
      userId,
      messId: req.user.messId,
      amount: parseFloat(amount),
      date,
      note: note || "",
      createdAt: new Date(),
    };

    const result = await collections.deposits.insertOne(deposit);

    await collections.notifications.insertOne({
      userId,
      messId: req.user.messId,
      title: "Deposit Added",
      message: `A deposit of ৳${amount} has been added`,
      type: "deposit",
      seen: false,
      createdAt: new Date(),
    });

    res.json({ success: true, deposit: { id: result.insertedId.toString(), ...deposit } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create deposit" });
  }
});

app.put("/api/deposits/:id", authMiddleware, async (req, res) => {
  try {
    const { userId, amount, date, note } = req.body;
    await collections.deposits.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { userId, amount: parseFloat(amount), date, note: note || "" } }
    );

    const deposit = await collections.deposits.findOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, deposit: transformDoc(deposit) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update deposit" });
  }
});

app.delete("/api/deposits/:id", authMiddleware, async (req, res) => {
  try {
    await collections.deposits.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Deposit deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete deposit" });
  }
});

// ============================================
// MEAL COST ROUTES
// ============================================

app.get("/api/meal-costs", authMiddleware, async (req, res) => {
  try {
    const { monthId } = req.query;
    const costs = await collections.mealCosts.find({ monthId }).toArray();
    res.json({ success: true, costs: transformDocs(costs) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get meal costs" });
  }
});

app.post("/api/meal-costs", authMiddleware, async (req, res) => {
  try {
    const { monthId, userId, amount, date, description, addAsDeposit } = req.body;

    const cost = {
      monthId,
      userId,
      messId: req.user.messId,
      amount: parseFloat(amount),
      date,
      description: description || "",
      addedAsDeposit: addAsDeposit || false,
      createdAt: new Date(),
    };

    const result = await collections.mealCosts.insertOne(cost);
    cost.id = result.insertedId.toString();

    if (addAsDeposit) {
      await collections.deposits.insertOne({
        userId,
        monthId,
        messId: req.user.messId,
        amount: parseFloat(amount),
        date,
        note: `Auto-deposit from meal cost: ${description}`,
        createdAt: new Date(),
      });
    }

    await collections.notifications.insertOne({
      userId,
      messId: req.user.messId,
      title: "Meal Cost Added",
      message: `A meal cost of ৳${amount} has been added${addAsDeposit ? " (also added as deposit)" : ""}`,
      type: "cost",
      seen: false,
      createdAt: new Date(),
    });

    res.json({ success: true, cost });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create meal cost" });
  }
});

app.put("/api/meal-costs/:id", authMiddleware, async (req, res) => {
  try {
    const { userId, amount, date, description } = req.body;
    await collections.mealCosts.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { userId, amount: parseFloat(amount), date, description } }
    );

    const cost = await collections.mealCosts.findOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, cost: transformDoc(cost) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update meal cost" });
  }
});

app.delete("/api/meal-costs/:id", authMiddleware, async (req, res) => {
  try {
    await collections.mealCosts.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Meal cost deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete meal cost" });
  }
});

// ============================================
// OTHER COST ROUTES
// ============================================

app.get("/api/other-costs", authMiddleware, async (req, res) => {
  try {
    const { monthId } = req.query;
    const costs = await collections.otherCosts.find({ monthId }).toArray();
    res.json({ success: true, costs: transformDocs(costs) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get other costs" });
  }
});

app.post("/api/other-costs", authMiddleware, async (req, res) => {
  try {
    const { monthId, userId, amount, date, description, isShared } = req.body;

    const cost = {
      monthId,
      userId,
      messId: req.user.messId,
      amount: parseFloat(amount),
      date,
      description: description || "",
      isShared: isShared || false,
      createdAt: new Date(),
    };

    const result = await collections.otherCosts.insertOne(cost);

    await notifyMembers(req.user.messId, req.userId, {
      title: "Other Cost Added",
      message: `A new cost of ৳${amount} has been added: ${description}`,
      type: "cost",
    });

    res.json({ success: true, cost: { id: result.insertedId.toString(), ...cost } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create other cost" });
  }
});

app.put("/api/other-costs/:id", authMiddleware, async (req, res) => {
  try {
    const { userId, amount, date, description, isShared } = req.body;
    await collections.otherCosts.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { userId, amount: parseFloat(amount), date, description, isShared } }
    );

    const cost = await collections.otherCosts.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.json({ success: true, cost: transformDoc(cost) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update other cost" });
  }
});

app.delete("/api/other-costs/:id", authMiddleware, async (req, res) => {
  try {
    await collections.otherCosts.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.json({ success: true, message: "Other cost deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete other cost" });
  }
});

// ============================================
// JOIN REQUEST ROUTES
// ============================================

app.get("/api/join-requests", authMiddleware, async (req, res) => {
  try {
    const requests = await collections.joinRequests
      .find({ messId: req.user.messId, status: "pending" })
      .toArray();

    const populatedRequests = await Promise.all(
      requests.map(async (request) => {
        const user = await collections.users.findOne({
          _id: new ObjectId(request.userId),
        });
        return {
          id: request._id.toString(),
          messId: request.messId,
          userId: request.userId,
          status: request.status,
          createdAt: request.createdAt,
          userName: user?.name,
          userEmail: user?.email,
          userPhone: user?.phone,
        };
      })
    );
    res.json({ success: true, requests: populatedRequests });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get join requests" });
  }
});

app.get("/api/join-requests/user", authMiddleware, async (req, res) => {
  try {
    const requests = await collections.joinRequests
      .find({ userId: req.userId })
      .toArray();
    res.json({ success: true, requests: transformDocs(requests) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get user join requests" });
  }
});

app.post("/api/join-requests", authMiddleware, async (req, res) => {
  try {
    const { messCode } = req.body;
    const mess = await collections.messes.findOne({
      code: messCode.toUpperCase(),
    });

    if (!mess) {
      return res.status(400).json({ success: false, error: "Invalid mess code" });
    }

    const existingRequest = await collections.joinRequests.findOne({
      userId: req.userId,
      messId: mess._id.toString(),
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, error: "Request already pending" });
    }

    const request = {
      userId: req.userId,
      messId: mess._id.toString(),
      messCode: messCode.toUpperCase(),
      status: "pending",
      createdAt: new Date(),
    };

    const result = await collections.joinRequests.insertOne(request);

    await notifyManager(mess._id.toString(), {
      title: "New Join Request",
      message: `${req.user.name} has requested to join your mess`,
      type: "join_request",
    });

    res.json({ success: true, request: { id: result.insertedId.toString(), ...request } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create join request" });
  }
});

app.put("/api/join-requests/:id/approve", authMiddleware, async (req, res) => {
  try {
    const request = await collections.joinRequests.findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!request) {
      return res.status(404).json({ success: false, error: "Request not found" });
    }

    await collections.joinRequests.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: "approved" } }
    );

    await collections.users.updateOne(
      { _id: new ObjectId(request.userId) },
      { $set: { messId: request.messId, isApproved: true } }
    );

    // Delete other pending requests for this user
    await collections.joinRequests.deleteMany({
      userId: request.userId,
      _id: { $ne: new ObjectId(req.params.id) },
      status: "pending",
    });

    await collections.notifications.insertOne({
      userId: request.userId,
      messId: request.messId,
      title: "Request Approved",
      message: "Your join request has been approved!",
      type: "join_request",
      seen: false,
      createdAt: new Date(),
    });

    res.json({ success: true, request: { ...request, id: request._id.toString(), status: "approved" } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to approve request" });
  }
});

app.put("/api/join-requests/:id/reject", authMiddleware, async (req, res) => {
  try {
    await collections.joinRequests.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: "rejected" } }
    );

    const request = await collections.joinRequests.findOne({
      _id: new ObjectId(req.params.id),
    });

    await collections.notifications.insertOne({
      userId: request.userId,
      messId: request.messId,
      title: "Request Rejected",
      message: "Your join request has been rejected.",
      type: "join_request",
      seen: false,
      createdAt: new Date(),
    });

    res.json({ success: true, request: transformDoc(request) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to reject request" });
  }
});

// ============================================
// NOTICE ROUTES
// ============================================

app.get("/api/notices", authMiddleware, async (req, res) => {
  try {
    const notices = await collections.notices
      .find({ messId: req.user.messId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, notices: transformDocs(notices) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get notices" });
  }
});

app.get("/api/notices/active", authMiddleware, async (req, res) => {
  try {
    const notice = await collections.notices.findOne({
      messId: req.user.messId,
      isActive: true,
    });
    res.json({ success: true, notice: transformDoc(notice) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get active notice" });
  }
});

app.post("/api/notices", authMiddleware, async (req, res) => {
  try {
    await collections.notices.updateMany(
      { messId: req.user.messId },
      { $set: { isActive: false } }
    );

    const notice = {
      ...req.body,
      messId: req.user.messId,
      createdBy: req.userId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collections.notices.insertOne(notice);

    await notifyMembers(req.user.messId, req.userId, {
      title: "New Notice",
      message: `New notice: ${notice.title}`,
      type: "notice",
    });

    res.json({ success: true, notice: { id: result.insertedId.toString(), ...notice } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create notice" });
  }
});

app.put("/api/notices/:id", authMiddleware, async (req, res) => {
  try {
    await collections.notices.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );

    const notice = await collections.notices.findOne({
      _id: new ObjectId(req.params.id),
    });

    res.json({ success: true, notice: transformDoc(notice) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update notice" });
  }
});

app.delete("/api/notices/:id", authMiddleware, async (req, res) => {
  try {
    await collections.notices.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Notice deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete notice" });
  }
});

// ============================================
// BAZAR DATE ROUTES
// ============================================

app.get("/api/bazar-dates", authMiddleware, async (req, res) => {
  try {
    const dates = await collections.bazarDates
      .find({ messId: req.user.messId })
      .toArray();
    res.json({ success: true, dates: transformDocs(dates) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get bazar dates" });
  }
});

app.post("/api/bazar-dates", authMiddleware, async (req, res) => {
  try {
    const { userId, userName, dates } = req.body;

    const existingDates = await collections.bazarDates
      .find({
        messId: req.user.messId,
        date: { $in: dates },
      })
      .toArray();

    if (existingDates.length > 0) {
      const conflictDates = existingDates.map((d) => d.date).join(", ");
      return res.status(400).json({
        success: false,
        error: `These dates are already assigned: ${conflictDates}`,
      });
    }

    const newDates = dates.map((date) => ({
      messId: req.user.messId,
      userId,
      userName,
      date,
      createdAt: new Date(),
    }));

    const result = await collections.bazarDates.insertMany(newDates);

    await collections.notifications.insertOne({
      userId,
      messId: req.user.messId,
      title: "Bazar Dates Assigned",
      message: `You have been assigned bazar duty for: ${dates.join(", ")}`,
      type: "bazar",
      seen: false,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      dates: newDates.map((date, index) => ({
        ...date,
        id: result.insertedIds[index].toString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create bazar dates" });
  }
});

app.delete("/api/bazar-dates/:id", authMiddleware, async (req, res) => {
  try {
    await collections.bazarDates.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.json({ success: true, message: "Bazar date deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete bazar date" });
  }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

app.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = await collections.notifications
      .find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, notifications: transformDocs(notifications) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get notifications" });
  }
});

app.put("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  try {
    await collections.notifications.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { seen: true } }
    );

    const notification = await collections.notifications.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.json({ success: true, notification: transformDoc(notification) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to mark as read" });
  }
});

app.put("/api/notifications/read-all", authMiddleware, async (req, res) => {
  try {
    await collections.notifications.updateMany(
      { userId: req.userId },
      { $set: { seen: true } }
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to mark all as read" });
  }
});

app.delete("/api/notifications/:id", authMiddleware, async (req, res) => {
  try {
    await collections.notifications.deleteOne({
      _id: new ObjectId(req.params.id),
    });
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete notification" });
  }
});

app.delete("/api/notifications", authMiddleware, async (req, res) => {
  try {
    await collections.notifications.deleteMany({ userId: req.userId });
    res.json({ success: true, message: "All notifications deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete notifications" });
  }
});

// ============================================
// NOTE ROUTES
// ============================================

app.get("/api/notes", authMiddleware, async (req, res) => {
  try {
    const notes = await collections.notes
      .find({ messId: req.user.messId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, notes: transformDocs(notes) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to get notes" });
  }
});

app.post("/api/notes", authMiddleware, async (req, res) => {
  try {
    const note = {
      ...req.body,
      messId: req.user.messId,
      createdBy: req.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collections.notes.insertOne(note);

    await notifyMembers(req.user.messId, req.userId, {
      title: "New Note Added",
      message: `New note: ${note.title}`,
      type: "notice",
    });

    res.json({ success: true, note: { id: result.insertedId.toString(), ...note } });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to create note" });
  }
});

app.put("/api/notes/:id", authMiddleware, async (req, res) => {
  try {
    await collections.notes.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );

    const note = await collections.notes.findOne({
      _id: new ObjectId(req.params.id),
    });
    res.json({ success: true, note: transformDoc(note) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update note" });
  }
});

app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
  try {
    await collections.notes.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Note deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete note" });
  }
});

// ============================================
// MEMBER MANAGEMENT ROUTES
// ============================================

app.put("/api/members/:id", authMiddleware, async (req, res) => {
  try {
    const { role, isApproved, isActive } = req.body;
    const updates = {};
    if (role !== undefined) updates.role = role;
    if (isApproved !== undefined) updates.isApproved = isApproved;
    if (isActive !== undefined) updates.isActive = isActive;

    await collections.users.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );

    // If making someone a manager, update the mess
    if (role === "manager") {
      await collections.messes.updateOne(
        { _id: new ObjectId(req.user.messId) },
        { $set: { managerId: req.params.id } }
      );
      // Demote current manager
      await collections.users.updateOne(
        { _id: new ObjectId(req.userId) },
        { $set: { role: "member" } }
      );
    }

    const user = await collections.users.findOne({ _id: new ObjectId(req.params.id) });
    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        fullName: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        messId: user.messId,
        isApproved: user.isApproved !== false,
        isActive: user.isActive !== false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update member" });
  }
});

app.delete("/api/members/:id", authMiddleware, async (req, res) => {
  try {
    await collections.users.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { messId: null, isApproved: false } }
    );
    res.json({ success: true, message: "Member removed" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to remove member" });
  }
});

// ============================================
// UTILITY ROUTES
// ============================================

app.get("/api/mess-code/check/:code", async (req, res) => {
  try {
    const mess = await collections.messes.findOne({
      code: req.params.code.toUpperCase(),
    });
    res.json({ success: true, exists: !!mess });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to check code" });
  }
});

app.get("/api/mess-code/generate", authMiddleware, async (req, res) => {
  try {
    const code = await generateUniqueMessCode();
    res.json({ success: true, code });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to generate code" });
  }
});

// ===========================
// DEFAULT ROUTE
// ===========================
app.get("/", (req, res) => {
  res.send("🚀 Mess Mate backend is running...");
});

// ===========================
// HEALTH CHECK ROUTE
// ===========================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    mongodb: mongoDbConnected ? "connected" : "disconnected",
    mongoDbConnected,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
