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

// User Schema with verificationCode and verified fields
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verificationCode: { type: String},  // New field for verification code
    verified: { type: Boolean, default: false }  // Field to mark if the user is verified
});
const User = mongoose.model('User', UserSchema);

// Utility function to generate a 6-digit code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();  // Generates a 6-digit code
};

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

// ✅ Signup API - Now with email verification
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Email or Username already taken' });
        }

        // Generate a verification code
        const verificationCode = generateVerificationCode();

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user with verification code and 'verified' set to false
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            verificationCode,
            verified: false
        });

        await newUser.save();

        // Send the verification code to the user's email
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: email,
            subject: 'Email Verification Code',
            text: `Hi ${username},\n\nPlease use the following code to verify your email: ${verificationCode}\n\nBest regards,\nNews Sentiment Analyzer Team`
        };

        const emailSent = await sendEmail(mailOptions);
        if (!emailSent) {
            return res.status(500).json({ error: "Email sending failed" });
        }

        // Send success response with message
        res.status(200).json({ message: "Signup successful. Please check your email for the verification code." });
    } catch (error) {
        console.error('❌ Signup error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ✅ Email verification API
app.post('/api/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;

        console.log("📥 Received Verification Request:", { email, code });

        if (!email || !code || code.length !== 6) {
            console.log("❌ Invalid code format received.");
            return res.status(400).json({ error: "Invalid code. Please enter a 6-digit code." });
        }

        const user = await User.findOne({ email });

        if (!user) {
            console.log(`❌ User not found for email: ${email}`);
            return res.status(404).json({ error: "User not found" });
        }

        console.log("🔍 Stored Code:", user.verificationCode, "| Entered Code:", code);

        // 🚨 Fix: Ensure `verificationCode` is not undefined
        if (!user.verificationCode) {
            console.log("❌ User does not have a stored verification code.");
            return res.status(400).json({ error: "Verification code expired or not found. Please request a new one." });
        }

        // Convert both to strings to avoid type mismatch
        if (String(user.verificationCode) !== String(code)) {
            console.log("❌ Verification failed: Incorrect code");
            return res.status(400).json({ error: "Invalid verification code" });
        }

        console.log("✅ Code matched, verifying user...");
        user.verified = true;
        user.verificationCode = undefined; // Clear the code after verification
        await user.save();

        console.log("✅ User verified successfully!");
        res.status(200).json({ message: "Email verified successfully!" });

    } catch (error) {
        console.error("❌ Verification error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Login API with debug logs
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("🔑 Login attempt:", { username });

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.log("❌ Login failed: User not found");
            return res.status(400).json({ error: "Invalid username or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Login failed: Incorrect password");
            return res.status(400).json({ error: "Invalid username or password" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log(`✅ Login successful for user ${username}`);
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
