const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration.js');  // ✅ Use the existing model
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const sendConfirmationEmail = require('../utils/sendEmail');

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
    const { event, name, USN, college, department, year, email, phone, members, payment } = req.body;

    // Group event validation
    const isGroupEvent = memberLimits[event]?.max > 1;
    
     // Use groupName for group events
    if (isGroupEvent) {
      name = groupName || name;
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

    // --- CHECK DUPLICATES FOR SAME EVENT ---
    const duplicateCheck = await Registration.findOne({
      event: event,
      $or: [
        { email: email },
        { USN: USN },
        { "members.usn": USN }
      ]
    });
    if (duplicateCheck) {
      return res.status(400).json({
        error: `You have already registered for ${event}.`
      });
    }
    
    // --- CHECK UNIQUE TRANSACTION ID ---
    const existingTransaction = await Registration.findOne({
      "payment.transactionId": payment.transactionId
    });
    if (existingTransaction) {
      return res.status(400).json({
        error: `Transaction ID "${payment.transactionId}" is already used for another registration.`
      });
    }
    if (isGroupEvent) {
      const existingGroup = await Registration.findOne({
        event: event,
        name: { $regex: `^${name.trim()}$`, $options: 'i' }
      });
      if (existingGroup) {
        return res.status(400).json({
          error: `Group "${name}" has already registered for ${event}.`
        });
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


    // ✅ Save to MongoDB
    const newRegistration = new Registration({ 
      event,
      name,
      USN: isGroupEvent ? '' : USN,
      college,
      department,
      year,
      email,
      phone,
      members: isGroupEvent ? members : [],
      payment: {              // ✅ Added payment field to MongoDB document
        transactionId: payment.transactionId,
        amount: payment.amount,
        method: payment.paymentMethod
      }
    });
    await newRegistration.save();

    // ✅ Save to Excel
    if (isGroupEvent) {
      // Save one row per member
      members.forEach(m => {
        const dataToSave = {
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
      // Solo events = single row
      const dataToSave = {
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

    
    // ✅ Send Confirmation Email
    try {
      await sendConfirmationEmail(email, event);
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(201).json({ message: 'Registration successful and saved to Excel, and email sent!' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Server error. Registration failed' });
  }
});

module.exports = router;
