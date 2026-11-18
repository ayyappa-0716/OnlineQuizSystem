
document.addEventListener("DOMContentLoaded", () => {

    const adminId = localStorage.getItem("adminId");

    if (!adminId) {
        window.location.href = "admin-login.html";
        return;
    }

    const quizSelect = document.getElementById("quizId");
    const form = document.getElementById("addQuestionForm");
    const message = document.getElementById("message");

    // Load available quizzes
    async function loadQuizzes() {
        try {
            const response = await fetch("/quizzes");

            if (!response.ok) {
                throw new Error("Unable to load quizzes.");
            }

            const data = await response.json();

            quizSelect.innerHTML =
                '<option value="">Select a quiz</option>';

            data.quizzes.forEach((quiz) => {
                const option = document.createElement("option");
                option.value = quiz.id;
                option.textContent = quiz.title;
                quizSelect.appendChild(option);
            });

            if (data.quizzes.length === 0) {
                quizSelect.innerHTML =
                    '<option value="">No quizzes available</option>';
            }

        } catch (error) {
            console.error("Quiz loading error:", error);
            quizSelect.innerHTML =
                '<option value="">Failed to load quizzes</option>';
        }
    }

    loadQuizzes();

    // Save a new question
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const quizId = quizSelect.value;

        const questionText =
            document.getElementById("question").value.trim();

        const optionA =
            document.getElementById("optionA").value.trim();

        const optionB =
            document.getElementById("optionB").value.trim();

        const optionC =
            document.getElementById("optionC").value.trim();

        const optionD =
            document.getElementById("optionD").value.trim();

        const correctAnswer =
            document.getElementById("correctAnswer").value;

        if (
            !quizId ||
            !questionText ||
            !optionA ||
            !optionB ||
            !optionC ||
            !optionD ||
            !["A", "B", "C", "D"].includes(correctAnswer)
        ) {
            message.style.color = "red";
            message.textContent =
                "Please fill in all question fields correctly.";
            return;
        }

        try {
            const response = await fetch("/admin/add-question", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    adminId,
                    quizId,
                    questionText,
                    optionA,
                    optionB,
                    optionC,
                    optionD,
                    correctAnswer
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
            console.error("Question saving error:", error);

            message.style.color = "red";
            message.textContent =
                "Unable to connect to the server.";
        }
    });

});
