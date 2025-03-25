document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const articlesFeed = document.getElementById("articlesFeed");

    async function fetchAndDisplayNews(query = "latest") {
        articlesFeed.innerHTML = ""; // Clear previous results

        try {
            const response = await fetch(`http://localhost:9090/api/news?q=${query}`);
            const newsData = await response.json();

            newsData.articles.slice(0, 7).forEach(async (news) => {
                const sentiment = await analyzeSentiment(news.title);

                // Assign sentiment class for different colors
                const sentimentClass = sentiment === "POSITIVE" ? "sentiment-positive" :
                                       sentiment === "NEGATIVE" ? "sentiment-negative" : 
                                       "sentiment-neutral";

                // Create news card
                const newsCard = document.createElement("div");
                newsCard.className = "news-card";
                newsCard.innerHTML = `
                    <h3>${news.title}</h3>
                    <p>${news.description || "No description available"}</p>
                    <span class="sentiment-box ${sentimentClass}">${sentiment}</span>
                `;

                articlesFeed.appendChild(newsCard);
            });
        } catch (error) {
            console.error("Error fetching news:", error);
        }
    }

    async function analyzeSentiment(newsText) {
        try {
            const response = await fetch("http://localhost:9090/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: newsText })
            });

            const data = await response.json();
            return data.sentiment || "Unknown";
        } catch (error) {
            console.error("Error analyzing sentiment:", error);
            return "Unknown";
        }
    }

    searchBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) fetchAndDisplayNews(query);
    });

    fetchAndDisplayNews(); // Fetch default news on load
});
