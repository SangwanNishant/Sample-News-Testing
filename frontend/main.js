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

    // New verification elements
    const verificationContainer = document.createElement("div");
    verificationContainer.innerHTML = `
        <h2>Email Verification</h2>
        <p>Enter the 6-digit code sent to your email.</p>
        <input type="text" id="verificationCode" placeholder="Enter code" required>
        <button id="verifyCodeBtn">Verify</button>
    `;
    verificationContainer.style.display = "none";
    authContainer.appendChild(verificationContainer);

    authContainer.appendChild(verificationContainer); // ✅ Now it's in the DOM

    // Select AFTER appending
    const verificationCodeInput = verificationContainer.querySelector("#verificationCode");
    const verifyCodeBtn = verificationContainer.querySelector("#verifyCodeBtn");


    const BACKEND_URL = "https://sample-news-testing.onrender.com";
    let pendingUserEmail = ""; // Store email for verification

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


    console.log("📌 Debugging Input Field:", verificationCodeInput);
    console.log("📌 Input Field Value:", verificationCodeInput?.value);


    verifyCodeBtn.addEventListener("click", async () => {
        const code = verificationCodeInput.value.trim();
        console.log("🔢 Entered Code:", code, "| Length:", code.length); 
        
        if (code.length !== 6) {
            alert("Invalid code. Please enter a 6-digit code.");
            return;
        }
    
        console.log("✅ Code length is valid, proceeding...");
        console.log("📧 Sending Email:", pendingUserEmail);
        
        try {
            console.log("📤 Sending verification request...");
            const response = await fetch(`${BACKEND_URL}/api/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: pendingUserEmail, code }),
            });
    
            console.log("📥 Response received, parsing JSON...");
            const data = await response.json();
            console.log("🔍 Server Response:", data);
    
            if (response.ok) {
                alert("✅ Email verified successfully!");
                authContainer.style.display = "none";
                mainContainer.style.display = "block";
            } else {
                alert("❌ " + (data.error || "Verification failed!"));
            }
        } catch (error) {
            console.error("❌ Error verifying email:", error);
        }
    });
    
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const identifier = loginIdentifier.value.trim();
        const password = loginPassword.value.trim();

        try {
            const response = await fetch(`${BACKEND_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: identifier, email: identifier, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("token", data.token);
                authContainer.style.display = "none";
                mainContainer.style.display = "block";
            } else {
                alert(data.error || "Login failed!");
            }
        } catch (error) {
            console.error("Error during login:", error);
        }
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
    }
});
