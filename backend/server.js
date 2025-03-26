import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch'; // Required for fetching news
import getSentimentAnalysis from './huggingFaceApi.js';

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  savedNews: [
    {
      title: String,
      url: String,
      source: String,
      publishedAt: Date,
    }
  ]
});
const User = mongoose.model('User', UserSchema);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// User Signup
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'All fields are required' });

  const existingUser = await User.findOne({ username });
  if (existingUser) return res.status(400).json({ error: 'Username already taken' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword });

  await newUser.save();
  res.json({ message: 'User created successfully' });
});

// User Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, userId: user._id });
});

// Fetch News
app.get('/api/news', async (req, res) => {
  const query = req.query.q || 'latest';

  try {
    const response = await fetch(`https://newsapi.org/v2/everything?q=${query}&apiKey=${process.env.NEWS_API_KEY}`);
    if (!response.ok) return res.status(response.status).json({ error: 'Failed to fetch news' });

    const data = await response.json();
    if (!data || !data.articles) return res.status(500).json({ error: 'Invalid news data received' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// Save News
app.post('/api/save-news', verifyToken, async (req, res) => {
  const { title, url, source, publishedAt } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.savedNews.push({ title, url, source, publishedAt });
    await user.save();

    res.json({ message: 'News saved successfully', savedNews: user.savedNews });
  } catch (error) {
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove Saved News
app.delete('/api/remove-news', verifyToken, async (req, res) => {
  const { title } = req.body;

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.savedNews = user.savedNews.filter(news => news.title !== title);
    await user.save();

    res.json({ message: 'News removed', savedNews: user.savedNews });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
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

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
