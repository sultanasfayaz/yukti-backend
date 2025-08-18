const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Registration = require('../models/Registration.js'); // Use your Register model

// ✅ Hardcoded admin credentials (move to .env in production)
const ADMIN_USER = "admin";
const ADMIN_PASS = "yukti123";
const JWT_SECRET = "secret123"; // keep secret in .env for production use

// ✅ Admin Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  console.log("🔹 Login Attempt:", req.body);

  // ✅ Check if username & password are provided
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // ✅ Trim and compare (case-insensitive username)
  if (username.trim().toLowerCase() === ADMIN_USER.toLowerCase() &&
      password.trim() === ADMIN_PASS) {

    // ✅ Generate JWT Token
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    console.log("✅ Admin login successful");
    return res.json({ token });
  }

  console.log("❌ Invalid login credentials");
  return res.status(401).json({ error: 'Invalid credentials' });
});

// ✅ Middleware to verify admin token
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ✅ Fetch all registered users (Protected Route)
router.get('/registrations', verifyAdmin, async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ date: -1 });
    res.json(registrations);
  } catch (err) {
    console.error("❌ Error fetching registrations:", err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;
