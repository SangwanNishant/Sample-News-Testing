import fetch from 'node-fetch';

const HF_API_URL = "https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Mapping for the labels
const labelMapping = {
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive"
};

async function getSentimentAnalysis(text) {
    try {
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: text })
        });

        const data = await response.json();

        if (!Array.isArray(data) || !data[0] || data[0].length === 0) {
            console.error("Invalid response from Hugging Face API:", data);
            return 'Unknown';
        }

        // Get highest confidence label
        const highestLabel = data[0].reduce((max, item) => item.score > max.score ? item : max, data[0][0]);
        
        return labelMapping[highestLabel.label] || 'Unknown';

    } catch (error) {
        console.error("Error in sentiment analysis:", error);
        return 'Unknown';
    }
}

export default getSentimentAnalysis;