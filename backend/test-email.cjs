require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'mohamedev2030@gmail.com',
    pass: process.env.SMTP_PASS,
  },
});

transporter.sendMail({
  from: 'mohamedev2030@gmail.com',
  to: 'mohamedev2020@gmail.com',
  subject: 'Test email from Firasah AI',
  html: '<h2>Test email - if you see this, SMTP works!</h2>',
}).then(r => {
  console.log('SUCCESS:', r.messageId);
  process.exit(0);
}).catch(e => {
  console.log('FAILED:', e.message);
  process.exit(1);
});
