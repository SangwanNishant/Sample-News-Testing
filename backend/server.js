import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import getSentimentAnalysis from './huggingFaceApi.js';

const app = express();
app.use(cors());
app.use(express.json());

// Fetch news from API
app.get('/api/news', async (req, res) => {
    const query = req.query.q || 'latest';
    try {
        const response = await fetch(`https://newsapi.org/v2/everything?q=${query}&apiKey=${process.env.NEWS_API_KEY}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Analyze Sentiment
app.post('/api/analyze', async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: "Text is required" });
    }

    const sentiment = await getSentimentAnalysis(text);
    res.json({ sentiment });
});

const PORT = 9090;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
