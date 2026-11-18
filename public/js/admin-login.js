
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("adminLoginForm");
    const message = document.getElementById("message");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("/admin-login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (response.ok) {

                localStorage.setItem("adminId", data.admin.id);
                localStorage.setItem("adminName", data.admin.name);
                localStorage.setItem("adminEmail", data.admin.email);

                message.style.color = "green";
                message.textContent = data.message;

                setTimeout(() => {
                    window.location.href = "admin-dashboard.html";
                }, 1000);

            } else {
                message.style.color = "red";
                message.textContent = data.message;
            }

        } catch (error) {
            console.error("Admin login error:", error);

            message.style.color = "red";
            message.textContent =
                "Unable to connect to the server.";
        }
    });

});
