document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const authTitle = document.getElementById("authTitle");
    const toggleAuth = document.getElementById("toggleAuth");
    const mainContainer = document.getElementById("mainContainer");
    const authContainer = document.getElementById("authContainer");

    const loginUsername = document.getElementById("loginUsername");
    const loginPassword = document.getElementById("loginPassword");
    const signupUsername = document.getElementById("signupUsername");
    const signupPassword = document.getElementById("signupPassword");

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const articlesFeed = document.getElementById("articlesFeed");
    const savedArticles = document.getElementById("savedArticles");
    const logoutBtn = document.getElementById("logoutBtn");

    loginForm.style.display = "block";
    signupForm.style.display = "none";

    toggleAuth.addEventListener("click", (e) => {
        e.preventDefault();
        if (loginForm.style.display === "block") {
            loginForm.style.display = "none";
            signupForm.style.display = "block";
            authTitle.textContent = "Sign Up";
            toggleAuth.innerHTML = `Already have an account? <a href="#" id="switchToLogin">Login</a>`;
        } else {
            loginForm.style.display = "block";
            signupForm.style.display = "none";
            authTitle.textContent = "Login";
            toggleAuth.innerHTML = `Don't have an account? <a href="#" id="switchToSignup">Sign up</a>`;
        }
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();

        try {
            const response = await fetch("http://localhost:9090/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem("token", data.token);
                authContainer.style.display = "none";
                mainContainer.style.display = "block";
                fetchAndDisplayNews();
                fetchSavedArticles();
            } else {
                alert(data.message || "Login failed!");
            }
        } catch (error) {
            console.error("Error during login:", error);
        }
    });

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = signupUsername.value.trim();
        const password = signupPassword.value.trim();

        try {
            const response = await fetch("http://localhost:9090/api/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem("token", data.token);
                authContainer.style.display = "none";
                mainContainer.style.display = "block";
                fetchAndDisplayNews();
                fetchSavedArticles();
            } else {
                alert(data.message || "Signup failed!");
            }
        } catch (error) {
            console.error("Error during signup:", error);
        }
    });

    async function fetchAndDisplayNews(query = "latest") {
        articlesFeed.innerHTML = "";

        try {
            const response = await fetch(`http://localhost:9090/api/news?q=${query}`);
            const newsData = await response.json();

            newsData.articles.slice(0, 7).forEach(async (news) => {
                const sentiment = await analyzeSentiment(news.title);

                const sentimentClass = sentiment === "POSITIVE" ? "sentiment-positive" :
                                       sentiment === "NEGATIVE" ? "sentiment-negative" :
                                       "sentiment-neutral";

                const newsCard = document.createElement("div");
                newsCard.className = "news-card";
                newsCard.innerHTML = `
                    <h3>${news.title}</h3>
                    <p>${news.description || "No description available"}</p>
                    <a href="${news.url}" target="_blank">Read More</a>
                    <span class="sentiment-box ${sentimentClass}">${sentiment}</span>
                `;

                const saveBtn = document.createElement("button");
                saveBtn.innerText = "Save";
                saveBtn.classList.add("save-btn");
                saveBtn.addEventListener("click", async () => {
                    await saveNews(news);
                });

                newsCard.appendChild(saveBtn);
                articlesFeed.appendChild(newsCard);
            });
        } catch (error) {
            console.error("Error fetching news:", error);
        }
    }

    async function saveNews(article) {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("You need to log in to save news!");
            return;
        }

        try {
            const response = await fetch("http://localhost:9090/api/save-news", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(article)
            });

            const data = await response.json();
            if (response.ok) {
                alert("News saved successfully!");
                fetchSavedArticles();
            } else {
                alert(data.error || "Failed to save news");
            }
        } catch (error) {
            console.error("Error saving news:", error);
        }
    }

    async function fetchSavedArticles() {
        savedArticles.innerHTML = "";

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                console.warn("No token found, cannot fetch saved news.");
                return;
            }

            const response = await fetch("http://localhost:9090/api/saved-news", {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            const data = await response.json();
            if (!Array.isArray(data)) {
                console.warn("Saved news is not an array:", data);
                savedArticles.innerHTML = "<p>No saved articles found.</p>";
                return;
            }

            data.forEach(news => {
                const newsCard = document.createElement("div");
                newsCard.className = "news-card";
                newsCard.innerHTML = `
                    <h3>${news.title}</h3>
                    <a href="${news.url}" target="_blank">Read more</a>
                    <button class="delete-btn" data-id="${news._id}">Delete</button>
                `;

                savedArticles.appendChild(newsCard);
            });

            document.querySelectorAll(".delete-btn").forEach(btn => {
                btn.addEventListener("click", async (event) => {
                    const newsId = event.target.getAttribute("data-id");
                    await deleteSavedArticle(newsId);
                });
            });

        } catch (error) {
            console.error("Error fetching saved news:", error);
        }
    }

    async function deleteSavedArticle(newsId) {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("You need to log in to delete news!");
                return;
            }

            const response = await fetch(`http://localhost:9090/api/delete-news/${newsId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            const data = await response.json();
            if (response.ok) {
                alert("News deleted successfully!");
                fetchSavedArticles();
            } else {
                alert(data.error || "Failed to delete news");
            }
        } catch (error) {
            console.error("Error deleting saved news:", error);
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

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        mainContainer.style.display = "none";
        authContainer.style.display = "block";
    });

    const token = localStorage.getItem("token");
    if (token) {
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        fetchAndDisplayNews();
        fetchSavedArticles();
    }
});
