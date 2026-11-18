
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("loginForm");

    if (!form) {
        console.error("Login form not found!");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        // Check empty fields
        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        try {
            // Send login request to server
            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {

                // Save student details
                localStorage.setItem("studentName", data.student.name);
                localStorage.setItem("studentEmail", data.student.email);
                localStorage.setItem("studentId", data.student.id);

                // Redirect to dashboard
                window.location.href = "dashboard.html";

            } else {
                alert("Login failed: " + data.message);
            }

        } catch (error) {
            console.error("Login error:", error);
            alert("Unable to connect to the server. Please try again.");
        }
    });

});
