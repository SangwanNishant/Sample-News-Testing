import fetch from 'node-fetch';

const API_URL = 'https://api-inference.huggingface.co/models/mistralai/Mistral-Small-3.1-24B-Instruct-2503';
const API_KEY = process.env.HUGGINGFACE_API_KEY;

export default async function getSentimentAnalysis(text) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: text })
        });

        const result = await response.json();
        console.log("FULL API RESPONSE:", result); // LOG THE ENTIRE RESPONSE

        if (Array.isArray(result) && result.length > 0 && result[0].label) {
            return result[0].label.toLowerCase(); // Extract sentiment label
        }

        return 'neutral'; // Default if no label is found
    } catch (error) {
        console.error("Error fetching sentiment:", error);
        return 'neutral';
    }
}