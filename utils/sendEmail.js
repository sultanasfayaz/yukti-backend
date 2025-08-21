// utils/sendEmail.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const sendConfirmationEmail = async (toEmail, eventName, uniqueId) => {
  try {
    // ✅ Use Gmail SMTP with App Password
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // use SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ Email content
    const mailOptions = {
      from: `"Yukti VTU Fest" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Registration Confirmation - ${eventName}`,
      html: `
        <h2>🎉 Registration Successful</h2>
        <p>Hello,</p>
        <p>You have successfully registered for the 
        <strong>${eventName}</strong> event at Yukti VTU Fest.</p>
        <p><strong>Your Unique Yukti ID:</strong> <span style="font-size:16px; color:#2c3e50;">${uniqueId}</span></p>
        <p>⚠️ Please keep this ID safe – you will need it during event verification.</p>
        <br/>
        <p>Regards,<br/>Yukti VTU Fest Organizing Team</p>
      `,
    };

    // ✅ Send email
    await transporter.sendMail(mailOptions);
    console.log(`✅ Confirmation email sent to ${toEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${toEmail}:`, error.message);
    throw error;
  }
};

module.exports = sendConfirmationEmail;
