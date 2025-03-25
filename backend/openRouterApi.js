import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeNews(text) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Using a free-tier model
            messages: [
                { role: "system", content: "Summarize the given news article and determine its sentiment as Positive, Negative, or Neutral." },
                { role: "user", content: text }
            ],
            temperature: 0.5,
        });

        if (!response.choices || response.choices.length === 0) {
            throw new Error("No valid response from OpenAI");
        }

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error with OpenAI API:", error);
        return "Error processing news.";
    }
}

export default analyzeNews;
