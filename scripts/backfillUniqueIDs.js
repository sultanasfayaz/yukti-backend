// scripts/backfillUniqueIds.js
require("dotenv").config();
const mongoose = require("mongoose");
const Registration = require("../models/Registration");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);
function generateUniqueId() {
  const year = new Date().getFullYear();
  return `YUKTI-${year}-${nanoid()}`;
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all registrations missing uniqueId
    const missing = await Registration.find({ uniqueId: { $exists: false } });

    console.log(`Found ${missing.length} registrations without uniqueId`);

    for (let reg of missing) {
      reg.uniqueId = generateUniqueId();
      await reg.save();
      console.log(`✔ Assigned ${reg.uniqueId} to ${reg.email} (${reg.event})`);
    }

    console.log("🎉 Backfill completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
})();
