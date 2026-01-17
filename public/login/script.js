const form = document.getElementById("loginForm");
const messageDiv = document.getElementById("message");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    messageDiv.textContent = "";
    messageDiv.style.color = "red";

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            window.location.href = "../dashboard/index.html";
        } else {
            messageDiv.textContent = result.message || "Login failed";
        }
    } catch (error) {
        messageDiv.textContent = "Failed jaringan, please try again.", 'error:', error;
    }
});
