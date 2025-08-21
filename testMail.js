// testMail.js
require("dotenv").config();
const nodemailer = require("nodemailer");

async function sendTestEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Yukti Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "✅ Test Mail from Yukti App",
      text: "This is a test email to confirm your Gmail + Nodemailer setup is working.",
      html: `<h3>✅ Nodemailer Test</h3>
             <p>If you see this mail, your Gmail App Password is working correctly 🎉</p>`,
    });

    console.log("✅ Test mail sent successfully:", info.messageId);
  } catch (err) {
    console.error("❌ Failed to send test mail:", err.message);
  }
}

sendTestEmail();
