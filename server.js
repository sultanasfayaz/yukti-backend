require('dotenv').config({ path: __dirname + '/.env' });


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const registerRoute = require('./routes/registerRoute');
const adminRoute = require('./routes/adminRoute');
const path = require("path");
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Debug log: check env vars
console.log("Loaded MONGO_URI:", process.env.MONGO_URI);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// ✅ MongoDB Connection
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env file!");
  process.exit(1); // Stop server if DB URI is missing
}

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // Exit if DB connection fails
  });

// Admin APIs
app.use('/api/admin', adminRoute);

app.use('/api', registerRoute);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
app.use(express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
