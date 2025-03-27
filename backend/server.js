import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fetch } from 'undici'; // Better alternative for fetch in Node.js 18+
import getSentimentAnalysis from './huggingFaceApi.js';

const app = express();
app.use(cors({
  origin: "*", // Allow all origins for testing
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  savedNews: [
    {
      title: String,
      url: { type: String, unique: true },
      source: String,
      publishedAt: Date,
    }
  ]
});
const User = mongoose.model('User', UserSchema);

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(403).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
          return res.status(403).json({ error: "Invalid or expired token" });
      }

      req.user = decoded;  // Attach decoded user info to request
      next();
  });
}


// User Signup
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields are required' });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });

    await newUser.save();
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'User created successfully', token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user._id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const GNEWS_API_KEY = process.env.GNEWS_API_KEY; // Use GNews API Key from .env
console.log("Using GNews API Key:", process.env.GNEWS_API_KEY);

app.get("/api/news", async (req, res) => {
    try {
        const query = req.query.q || "latest";
        const url = `https://gnews.io/api/v4/search?q=${query}&token=${GNEWS_API_KEY}&lang=en&max=10`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`GNews API Error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error fetching news:", error);
        res.status(500).json({ error: "Failed to fetch news" });
    }
});


// Save News Article
app.post('/api/save-news', verifyToken, async (req, res) => {
  if (!req.user || !req.user.userId) {
    return res.status(403).json({ error: 'Unauthorized: Invalid or missing token' });
  }

  const { title, url, source, publishedAt } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Extract source name if source is an object
    const sourceName = typeof source === 'object' && source.name ? source.name : String(source);

    // Check if article is already saved
    if (user.savedNews.some(news => news.url === url)) {
      return res.status(400).json({ error: 'Article already saved' });
    }

    user.savedNews.push({
      title: title || "No Title", // Ensure title is not undefined
      url,
      source: sourceName || "Unknown Source", // Ensure source is not undefined
      publishedAt: publishedAt ? new Date(publishedAt) : new Date() // Ensure date is valid
    });

    await user.save();
    res.json({ message: 'News saved successfully', savedNews: user.savedNews });

  } catch (error) {
    console.error('Error saving news:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get Saved News
app.get('/api/saved-news', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('savedNews');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user.savedNews);
  } catch (error) {
    console.error('Error fetching saved news:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove Saved News
app.delete('/api/delete-news/:id', verifyToken, async (req, res) => {
  try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      user.savedNews = user.savedNews.filter(news => news._id.toString() !== req.params.id);
      await user.save();

      res.json({ message: "News deleted successfully" });
  } catch (error) {
      console.error("Error deleting news:", error);
      res.status(500).json({ error: "Server error" });
  }
});


// Sentiment Analysis
app.post('/api/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const sentiment = await getSentimentAnalysis(text);
    res.json({ sentiment });
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    res.status(500).json({ error: 'Sentiment analysis failed' });
  }
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
