import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fetch } from 'undici';
import getSentimentAnalysis from './huggingFaceApi.js';
import nodemailer from 'nodemailer';

console.log("📨 SMTP Email Config:", process.env.SMTP_EMAIL, process.env.SMTP_PASSWORD ? "✅ Loaded" : "❌ Not Loaded");

// ✅ Load environment variables
if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD || !process.env.MONGO_URI || !process.env.JWT_SECRET) {
    console.error("❌ Missing environment variables. Check your .env file.");
    process.exit(1);
}

// ✅ Setup Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
    }
});

// ✅ Verify SMTP connection before sending emails
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP Connection Error:", error);
    } else {
        console.log("✅ SMTP Connection Verified. Ready to send emails.");
    }
});

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// ✅ Email sending function with proper error handling
const sendEmail = async (mailOptions) => {
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${mailOptions.to}:`, info.response);
        return true;
    } catch (error) {
        console.error(`❌ Email failed to ${mailOptions.to}:`, error);
        return false;
    }
};

// ✅ Signup API - Now with full debug logs
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  // Log the request body to check if it is correctly received
  console.log('📩 Received Signup Data:', req.body);

  console.log(`📩 Signup request for ${email}`);

  if (!username || !email || !password) {
      console.log('❌ Missing signup fields');
      return res.status(400).json({ error: 'All fields are required' });
  }

  try {
      console.log('✅ Checking if user already exists...');
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
          console.log(`❌ Email ${email} or Username ${username} already exists`);
          return res.status(400).json({ error: 'Email or Username already taken' });
      }

      console.log(`✅ User ${username} does not exist, proceeding with creation`);

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, email, password: hashedPassword });

      await newUser.save();
      console.log(`✅ User ${username} created successfully, now sending email`);

      const mailOptions = {
          from: process.env.SMTP_EMAIL,
          to: `${email}`,
          subject: 'Welcome to News Sentiment Analyzer!',
          text: `Hi ${username},\n\nThank you for signing up! We're excited to have you on board.\n\nBest regards,\nNews Sentiment Analyzer Team`
      };

      // Log before sending email
      console.log('📧 Sending confirmation email...');
      const emailSent = await sendEmail(mailOptions);
      if (!emailSent) {
          console.log('❌ Email sending failed');
          return res.status(500).json({ error: "Email sending failed" });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      console.log(`✅ Email sent successfully to ${email}, user created, sending token`);

      return res.status(200).json({ message: "User created successfully, email sent", token });
  } catch (error) {
      console.error('❌ Signup error:', error);
      return res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Login API with debug logs
app.post('/api/login', async (req, res) => {
    const { username, email, password } = req.body;
    console.log("🔑 Login attempt:", { username, email });

    try {
        const user = await User.findOne({ $or: [{ username }, { email }] });
        if (!user) {
            console.log("❌ Login failed: User not found");
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Login failed: Incorrect password");
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log(`✅ Login successful for user ${username || email}`);
        res.json({ token, userId: user._id });
    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ✅ News Fetching API
app.get("/api/news", async (req, res) => {
    try {
        const query = req.query.q || "latest";
        const url = `https://gnews.io/api/v4/search?q=${query}&token=${process.env.GNEWS_API_KEY}&lang=en&max=10`;

        const response = await fetch(url);
        if (!response.ok) {
            console.error("❌ GNews API failed:", response.statusText);
            throw new Error(`GNews API Error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("❌ Error fetching news:", error);
        res.status(500).json({ error: "Failed to fetch news" });
    }
});

// ✅ Sentiment Analysis API
app.post('/api/analyze', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    try {
        const sentiment = await getSentimentAnalysis(text);
        console.log("✅ Sentiment Analysis Response:", sentiment);
        res.json({ sentiment });
    } catch (error) {
        console.error("❌ Error in sentiment analysis:", error);
        res.status(500).json({ error: "Sentiment analysis failed", details: error.message });
    }
});

// ✅ Start Server
const PORT = process.env.PORT || 1000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
