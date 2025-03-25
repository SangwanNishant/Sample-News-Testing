import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.OPENROUTER_API_KEY;

async function testOpenRouter() {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: "mistral",
                messages: [{ role: "user", content: "Summarize this text: The stock market crashed." }],
                temperature: 0.7
            })
        });

        const data = await response.json();
        console.log("OpenRouter API Response:", data);
    } catch (error) {
        console.error("Error testing OpenRouter API:", error);
    }
}

testOpenRouter();
