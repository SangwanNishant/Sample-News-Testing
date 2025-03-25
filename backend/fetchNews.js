import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const NEWS_API_KEY = process.env.NEWS_API_KEY;

async function fetchNews(query) {
    try {
        const response = await fetch(
            `https://newsapi.org/v2/everything?q=${query}&apiKey=${NEWS_API_KEY}`
        );
        const data = await response.json();

        if (!data.articles || data.articles.length === 0) {
            console.log("No articles found for query:", query);
            return []; // ✅ Always return an array
        }

        return data.articles; // Return only the articles
    } catch (error) {
        console.error("Error fetching news:", error);
        return []; // ✅ Always return an array
    }
}

export default fetchNews;
