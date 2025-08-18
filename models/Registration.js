const mongoose = require('mongoose');

// ✅ Define schema for group members
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  usn: { type: String, required: true }
});
// ✅ Schema for payment details
const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true } // e.g., UPI, Card, Cash
});

const registrationSchema = new mongoose.Schema({
  event: { type: String, required: true },
  name: { type: String, required: true },
  USN: { type: String, required: true },
  college: { type: String, required: true },
  department: { type: String, required: true },
  year: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  members: [memberSchema],  // ✅ store group members as sub-documents
  payment: paymentSchema,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Registration', registrationSchema);
