import nodemailer from 'nodemailer';
import 'dotenv/config';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

const mailOptions = {
  from: process.env.SMTP_EMAIL,
  to: 'depito9673@dizigg.com', // Replace with a test email
  subject: 'Test Email from Nodemailer',
  text: 'If you received this, Gmail SMTP is working!'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent:', info.response);
  }
});
