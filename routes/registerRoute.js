const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration.js');  // ✅ Use the existing model
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const sendConfirmationEmail = require('../utils/sendEmail');
const { customAlphabet } = require("nanoid");

// ================== CONFIG ==================
const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);
function generateUniqueId() {
  const year = new Date().getFullYear();
  return `YUKTI-${year}-${nanoid()}`;
}

// ✅ Excel file path
// ✅ File paths for separate Excel files
const soloFilePath = path.join(__dirname, '../solo_registrations.xlsx');
const groupFilePath = path.join(__dirname, '../group_registrations.xlsx');

// ✅ Member limits per event (same as frontend)
const memberLimits = {
  skit: { min: 5, max: 8 },
  mime: { min: 6, max: 8 },
  dumb_charades: { min: 2, max: 2 },
  fashion_show: { min: 12, max: 15 },
  group_dance: { min: 6, max: 8 },
  group_singing: { min: 6, max: 6 },
  mad_ads: { min: 5, max: 5 },
  gyan_thantra: { min: 2, max: 2 },
  roadies: { min: 3, max: 3 },
  new_product_launch: { min: 3, max: 5 }
};

// ✅ Function to append data to Excel
function saveToExcel(filePath, data) {
  let workbook, worksheet;

  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let existingData = XLSX.utils.sheet_to_json(worksheet);
    existingData.push(data);
    worksheet = XLSX.utils.json_to_sheet(existingData);
    workbook.Sheets[workbook.SheetNames[0]] = worksheet;
  } else {
    // If file does not exist, create with headers
    const headers = Object.keys(data); // Extract column names from data keys
    const initialData = [headers.reduce((acc, key) => {
      acc[key] = key; // First row will be header labels
      return acc;
    }, {})];

    // Add the first row of headers + the first data row
    initialData.push(data);

    worksheet = XLSX.utils.json_to_sheet(initialData, { skipHeader: true });
   
    
  }
  // ✅ Freeze the first row in Excel
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

  // Replace or append the sheet
  if (!workbook) workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
  XLSX.writeFile(workbook, filePath);
}

    
// ✅ Route to register user
router.post('/register', async (req, res) => {
  try {
    let { event, name, USN, college, department, year, email, phone, members, payment } = req.body;

    // Group event check
    const isGroupEvent = memberLimits[event]?.max > 1;
    if (isGroupEvent && req.body.groupName) {
      name = req.body.groupName; // use group name if provided
    }

    // --- VALIDATION ---
    if (!event || !name || !college || !department || !year || !email || !phone) {
      return res.status(400).json({ error: 'All required fields must be filled!' });
    }
    if (!payment || !payment.transactionId || !payment.amount || !payment.paymentMethod) {
      return res.status(400).json({ error: 'All payment details are required!' });
    }
    if (!isGroupEvent && !USN) {
      return res.status(400).json({ error: 'USN is required for solo events!' });
    }

    // --- DUPLICATE CHECK (same event) ---
    const duplicateCheck = await Registration.findOne({
      event: event,
      $or: [{ email: email }, { USN: USN }, { "members.usn": USN }]
    });
    if (duplicateCheck) {
      return res.status(400).json({ error: `You have already registered for ${event}.` });
    }

    // --- UNIQUE TRANSACTION ID CHECK ---
    const existingTransaction = await Registration.findOne({ "payment.transactionId": payment.transactionId });
    if (existingTransaction) {
      return res.status(400).json({ error: `Transaction ID "${payment.transactionId}" is already used for another registration.` });
    }

    // --- GROUP VALIDATION ---
    if (isGroupEvent) {
      const existingGroup = await Registration.findOne({
        event: event,
        name: { $regex: `^${name.trim()}$`, $options: 'i' }
      });
      if (existingGroup) {
        return res.status(400).json({ error: `Group "${name}" has already registered for ${event}.` });
      }

      const { min, max } = memberLimits[event];
      if (!members || members.length < min || members.length > max) {
        return res.status(400).json({ error: `${event} requires between ${min} and ${max} members.` });
      }
      for (const m of members) {
        if (!m.name?.trim() || !m.usn?.trim()) {
          return res.status(400).json({ error: 'Each group member must have a name and USN.' });
        }
      }
    }

    // --- UNIQUE ID (reuse or generate new) ---
    const existingUser = await Registration.findOne({ email });
    let uniqueId;
    if (existingUser) {
      uniqueId = existingUser.uniqueId;
    } else {
      uniqueId = generateUniqueId();
    }

    // ✅ Save to MongoDB
    const newRegistration = new Registration({
      uniqueId,
      event,
      name,
      USN: isGroupEvent ? '' : USN,
      college,
      department,
      year,
      email,
      phone,
      members: isGroupEvent ? members : [],
      payment: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        method: payment.paymentMethod
      }
    });
    await newRegistration.save();
    
    // ✅ Send email immediately so frontend knows if it worked
    let emailSent = false;
    try {
      await sendConfirmationEmail(email, event, uniqueId);
      emailSent = true;
    } catch (err) {
      console.error("❌ Email sending failed:", err.message);
    }

    // ✅ Respond instantly to frontend
    res.status(201).json({
      message: 'Registration successful!',
      uniqueId,
      event,
      emailSent
    });

    // ✅ Do Excel + Email in background (non-blocking)
    process.nextTick(async () => {
      try {
        if (isGroupEvent) {
          members.forEach(m => {
            const dataToSave = {
              Unique_ID: uniqueId,
              Event: event,
              Group_Name: name,
              Member_Name: m.name,
              Member_USN: m.usn,
              College: college,
              Department: department,
              Year: year,
              Email: email,
              Phone: phone,
              Transaction_ID: payment.transactionId,
              Amount: payment.amount,
              Payment_Method: payment.paymentMethod,
              Date: new Date()
            };
            saveToExcel(groupFilePath, dataToSave);
          });
        } else {
          const dataToSave = {
            Unique_ID: uniqueId,
            Event: event,
            Name: name,
            USN: USN,
            College: college,
            Department: department,
            Year: year,
            Email: email,
            Phone: phone,
            Transaction_ID: payment.transactionId,
            Amount: payment.amount,
            Payment_Method: payment.paymentMethod,
            Date: new Date()
          };
          saveToExcel(soloFilePath, dataToSave);
        }
        console.log(`✅ Excel saved for ${email}`);
      } catch (err) {
        console.error("⚠️ Excel save failed:", err.message);
      }
        
    });

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Server error. Registration failed' });
  }
});

module.exports = router;
