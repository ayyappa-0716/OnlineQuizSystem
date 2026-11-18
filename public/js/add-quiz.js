
document.addEventListener("DOMContentLoaded", () => {

    const adminId = localStorage.getItem("adminId");

    if (!adminId) {
        window.location.href = "admin-login.html";
        return;
    }

    const form = document.getElementById("addQuizForm");
    const message = document.getElementById("message");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const totalMarks = Number(document.getElementById("totalMarks").value);
        const duration = Number(document.getElementById("duration").value);

        if (
            !title ||
            !description ||
            !Number.isInteger(totalMarks) ||
            totalMarks <= 0 ||
            !Number.isInteger(duration) ||
            duration < 1 ||
            duration > 180
        ) {
            message.style.color = "red";
            message.textContent = "Please enter valid quiz details and a duration between 1 and 180 minutes.";
            return;
        }

        try {
            const response = await fetch("/admin/add-quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    adminId,
                    title,
                    description,
                    totalMarks,
                    duration
                })
            });

            const data = await response.json();

            if (response.ok) {
                message.style.color = "green";
                message.textContent = data.message;
                form.reset();
                document.getElementById("duration").value = 30;
            } else {
                message.style.color = "red";
                message.textContent = data.message;
            }

        } catch (error) {
            console.error("Add quiz error:", error);
            message.style.color = "red";
            message.textContent = "Unable to connect to the server.";
        }
    });

});
