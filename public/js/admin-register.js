
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("adminRegisterForm");
    const message = document.getElementById("message");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            message.style.color = "red";
            message.textContent = "Passwords do not match!";
            return;
        }

        if (password.length < 6) {
            message.style.color = "red";
            message.textContent =
                "Password must contain at least 6 characters.";
            return;
        }

        try {
            const response = await fetch("/admin-register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {
                message.style.color = "green";
                message.textContent = data.message;

                form.reset();
            } else {
                message.style.color = "red";
                message.textContent = data.message;
            }

        } catch (error) {
            console.error("Admin registration error:", error);

            message.style.color = "red";
            message.textContent =
                "Unable to connect to the server.";
        }
    });

});
