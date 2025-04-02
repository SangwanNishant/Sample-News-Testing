document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const authTitle = document.getElementById("authTitle");
    const toggleAuth = document.getElementById("toggleAuth");
    const mainContainer = document.getElementById("mainContainer");
    const authContainer = document.getElementById("authContainer");

    const loginIdentifier = document.getElementById("loginIdentifier");
    const loginPassword = document.getElementById("loginPassword");
    const signupUsername = document.getElementById("signupUsername");
    const signupEmail = document.getElementById("signupEmail");
    const signupPassword = document.getElementById("signupPassword");

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const articlesFeed = document.getElementById("articlesFeed");
    const logoutBtn = document.getElementById("logoutBtn");

    const BACKEND_URL = "https://sample-news-testing.onrender.com";
    let pendingUserEmail = "";

    // 🔹 Email Verification Elements
    const verificationContainer = document.createElement("div");
    verificationContainer.innerHTML = `
        <h2>Email Verification</h2>
        <p>Enter the 6-digit code sent to your email.</p>
        <input type="text" id="verificationCode" placeholder="Enter code" required>
        <button id="verifyCodeBtn">Verify</button>
    `;
    verificationContainer.style.display = "none";
    authContainer.appendChild(verificationContainer);

    const verificationCodeInput = verificationContainer.querySelector("#verificationCode");
    const verifyCodeBtn = verificationContainer.querySelector("#verifyCodeBtn");

    // 🔹 Toggle Between Login & Signup
    toggleAuth.addEventListener("click", (e) => {
        e.preventDefault();
        if (loginForm.style.display === "block") {
            loginForm.style.display = "none";
            signupForm.style.display = "block";
            verificationContainer.style.display = "none";
            authTitle.textContent = "Sign Up";
            toggleAuth.innerHTML = `Already have an account? <a href="#" id="switchToLogin">Login</a>`;
        } else {
            loginForm.style.display = "block";
            signupForm.style.display = "none";
            verificationContainer.style.display = "none";
            authTitle.textContent = "Login";
            toggleAuth.innerHTML = `Don't have an account? <a href="#" id="switchToSignup">Sign up</a>`;
        }
    });

    // 🔹 Signup with Email Verification
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = signupUsername.value.trim();
        const email = signupEmail.value.trim();
        const password = signupPassword.value.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                pendingUserEmail = email;
                signupForm.style.display = "none";
                verificationContainer.style.display = "block";
            } else {
                alert(data.error || "Signup failed!");
            }
        } catch (error) {
            console.error("Error during signup:", error);
        }
    });

    // 🔹 Verify Email Code
    verifyCodeBtn.addEventListener("click", async () => {
        const code = verificationCodeInput.value.trim();
        if (code.length !== 6) {
            alert("Invalid code. Please enter a 6-digit code.");
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: pendingUserEmail, code }),
            });

            const data = await response.json();

            if (response.ok) {
                alert("✅ Email verified successfully!");
                authContainer.style.display = "none";
                mainContainer.style.display = "block";
                fetchAndDisplayNews();
            } else {
                alert("❌ " + (data.error || "Verification failed!"));
            }
        } catch (error) {
            console.error("❌ Error verifying email:", error);
        }
    });

    // 🔹 Login
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const identifier = loginIdentifier.value.trim();
        const password = loginPassword.value.trim();

        try {
            const response = await fetch(`${BACKEND_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: identifier, password }),
            });

            const data = await response.json();

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

    // 🔹 Fetch & Display News
    async function fetchAndDisplayNews(query = "latest") {
        articlesFeed.innerHTML = "";

        try {
            const response = await fetch(`${BACKEND_URL}/api/news?q=${query}`);
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

                articlesFeed.appendChild(newsCard);
            });
        } catch (error) {
            console.error("Error fetching news:", error);
        }
    }

    // 🔹 Sentiment Analysis
    async function analyzeSentiment(newsText) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: newsText }),
            });

            const data = await response.json();
            return data.sentiment || "Unknown";
        } catch (error) {
            console.error("Error analyzing sentiment:", error);
            return "Unknown";
        }
    }

    // 🔹 Search News
    searchBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) fetchAndDisplayNews(query);
    });

    // 🔹 Logout
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        mainContainer.style.display = "none";
        authContainer.style.display = "block";
    });

    // 🔹 Auto-Login
    const token = localStorage.getItem("token");
    if (token) {
        authContainer.style.display = "none";
        mainContainer.style.display = "block";
        fetchAndDisplayNews();
    }
});
