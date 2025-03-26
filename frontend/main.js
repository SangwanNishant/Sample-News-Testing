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
    const logoutBtn = document.getElementById("logoutBtn");

    // Show Login Form by Default
    loginForm.style.display = "block";
    signupForm.style.display = "none";

    // Toggle Between Login & Signup
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

    // Function to Handle Login
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
                fetchAndDisplayNews(); // Fetch news after login
            } else {
                alert(data.message || "Login failed!");
            }
        } catch (error) {
            console.error("Error during login:", error);
        }
    });

    // Function to Handle Signup
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
                localStorage.setItem("token", data.token); // Auto login
                authContainer.style.display = "none";
                mainContainer.style.display = "block";
                fetchAndDisplayNews();
            } else {
                alert(data.message || "Signup failed!");
            }
        } catch (error) {
            console.error("Error during signup:", error);
        }
    });
    

    // Function to Fetch & Display News
    async function fetchAndDisplayNews(query = "latest") {
        articlesFeed.innerHTML = ""; // Clear previous results

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
                    <span class="sentiment-box ${sentimentClass}">${sentiment}</span>
                `;

                articlesFeed.appendChild(newsCard);
            });
        } catch (error) {
            console.error("Error fetching news:", error);
        }
    }

    // Function to Analyze Sentiment
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

    // Search Button Click Event
    searchBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) fetchAndDisplayNews(query);
    });

    // Logout Functionality
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        mainContainer.style.display = "none"; // Hide main app
        authContainer.style.display = "block"; // Show login/signup
    });

    // Check if User is Logged In
    const token = localStorage.getItem("token");
    if (token) {
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        fetchAndDisplayNews(); // Fetch news if user is already logged in
    }
});
