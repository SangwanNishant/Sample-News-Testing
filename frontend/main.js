    document.addEventListener("DOMContentLoaded", () => {
        const loginForm = document.getElementById("loginForm");
        const signupForm = document.getElementById("signupForm");
        const authTitle = document.getElementById("authTitle");
        const toggleAuth = document.getElementById("toggleAuth");
        const mainContainer = document.getElementById("mainContainer");
        const authContainer = document.getElementById("authContainer");

        const loginIdentifier = document.getElementById("loginIdentifier"); // Username or Email
        const loginPassword = document.getElementById("loginPassword");
        const signupUsername = document.getElementById("signupUsername");
        const signupEmail = document.getElementById("signupEmail");
        const signupPassword = document.getElementById("signupPassword");

        const searchInput = document.getElementById("searchInput");
        const searchBtn = document.getElementById("searchBtn");
        const articlesFeed = document.getElementById("articlesFeed");
        const logoutBtn = document.getElementById("logoutBtn");

        loginForm.style.display = "block";
        signupForm.style.display = "none";

        const BACKEND_URL = "https://sample-news-testing.onrender.com";

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

        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Signup button clicked");  // Debug log
        
            const username = signupUsername.value.trim();
            const email = signupEmail.value.trim();
            const password = signupPassword.value.trim();
        
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert("Please enter a valid email address.");
                return;
            }
        
            console.log('📨 Sending Signup Request:', { username, email, password });

            try {
                const response = await fetch(`${BACKEND_URL}/api/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password }),
                });
        
                const data = await response.json();
                console.log("Signup response:", data);  // Debug log
        
                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    authContainer.style.display = "none";
                    mainContainer.style.display = "block";                                                      
                    fetchAndDisplayNews();
                } else {
                    alert(data.error || "Signup failed!");
                }
            } catch (error) {
                console.error("Error during signup:", error);
            }
        });
        
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            console.log("Login button clicked");  // Debug log
        
            const identifier = loginIdentifier.value.trim();
            const password = loginPassword.value.trim();
        
            console.log("Sending login request...");  // Debug log
            try {
                const response = await fetch(`${BACKEND_URL}/api/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: identifier, email: identifier, password })
                });
        
                const data = await response.json();
                console.log("Login response:", data);  // Debug log
        
                if (response.ok) {
                    localStorage.setItem("token", data.token);
                    authContainer.style.display = "none";
                    mainContainer.style.display = "block";
                    fetchAndDisplayNews();
                } else {
                    alert(data.error || "Login failed!");
                }
            } catch (error) {
                console.error("Error during login:", error);
            }
        });
        
        

        async function fetchAndDisplayNews(query = "latest") {
            articlesFeed.innerHTML = "";

            try {
                const response = await fetch(`${BACKEND_URL}/api/news?q=${query}`);
                const newsData = await response.json();

                if (!newsData.articles || newsData.articles.length === 0) {
                    articlesFeed.innerHTML = "<p>No news found.</p>";
                    return;
                }

                newsData.articles.slice(0, 7).forEach(async (news) => {
                    const sentiment = await analyzeSentiment(news.title);

                    const sentimentClass = sentiment === "POSITIVE" ? "sentiment-positive" :
                                        sentiment === "NEGATIVE" ? "sentiment-negative" :
                                        "sentiment-neutral";

                    const newsCard = document.createElement("div");
                    newsCard.className = "news-card";
                    newsCard.innerHTML = `
                        <h3>${news.title}</h3>
                        <p>${news.description ? news.description : "No description available."}</p>
                        <a href="${news.url}" target="_blank">Read More</a>
                        <span class="sentiment-box ${sentimentClass}">${sentiment}</span>
                    `;

                    articlesFeed.appendChild(newsCard);
                });

            } catch (error) {
                console.error("Error fetching news:", error);
                articlesFeed.innerHTML = "<p>Failed to load news.</p>";
            }
        }

        async function analyzeSentiment(newsText) {
            try {
                const response = await fetch(`${BACKEND_URL}/api/analyze`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: newsText })
                });

                const data = await response.json();
                console.log("Sentiment API Response:", data); // Debugging

                return data.sentiment || "Unknown";
            } catch (error) {
                console.error("Error analyzing sentiment:", error);
                return "Unknown";
            }
        }

        // document.getElementById('signup-btn').addEventListener('click', async (e) => {
        //     e.preventDefault();
        
        //     if (window.signupInProgress) return; // Prevent duplicate clicks
        //     window.signupInProgress = true;
        
        //     try {
        //         const res = await fetch("/api/signup", { method: "POST", body: JSON.stringify({ username, email, password }) });
        //         const data = await res.json();
        //         console.log("Signup response:", data);
        //     } finally {
        //         window.signupInProgress = false;
        //     }
        // });
        

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
        }
    });
