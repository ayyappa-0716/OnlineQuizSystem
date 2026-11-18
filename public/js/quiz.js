
document.addEventListener("DOMContentLoaded", () => {

    const quizForm = document.getElementById("quizForm");
    const quizInfo = document.getElementById("quizInfo");
    const resultDiv = document.getElementById("result");
    const timerDisplay = document.getElementById("timer");

    const studentId = localStorage.getItem("studentId");
    const studentName = localStorage.getItem("studentName");

    // Check student login
    if (!studentId || !studentName) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    // Get quiz ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get("quizId");

    if (!quizId || !Number.isInteger(Number(quizId)) ||
        Number(quizId) <= 0) {
        alert("Invalid quiz.");
        window.location.href = "dashboard.html";
        return;
    }

    let questions = [];
    let isSubmitting = false;
    let timerInterval = null;
    let remainingSeconds = 0;

    // Start countdown timer
    function startTimer(durationMinutes) {

        remainingSeconds = durationMinutes * 60;

        function updateTimer() {

            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;

            timerDisplay.textContent =
                String(minutes).padStart(2, "0") + ":" +
                String(seconds).padStart(2, "0");

            if (remainingSeconds <= 60) {
                timerDisplay.classList.add("danger");
            }

            if (remainingSeconds <= 0) {
                clearInterval(timerInterval);
                timerDisplay.textContent = "Time's Up!";

                alert("Time is over! Your quiz will be submitted automatically.");

                submitQuiz(true);
                return;
            }

            remainingSeconds--;
        }

        updateTimer();

        timerInterval = setInterval(updateTimer, 1000);
    }

    // Load quiz questions
    async function loadQuiz() {

        try {
            const response = await fetch(`/quiz/${quizId}/questions`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load quiz.");
            }

            questions = data.questions;

            document.getElementById("quizTitle").textContent =
                data.quiz.title;

            document.getElementById("quizMarks").textContent =
                "Total Marks: " + data.quiz.total_marks;

            quizForm.innerHTML = "";

            questions.forEach((question, index) => {

                const questionDiv = document.createElement("div");
                questionDiv.className = "question";

                questionDiv.innerHTML = `
                    <h3>${index + 1}. ${question.question_text}</h3>

                    <label>
                        <input type="radio" name="question${question.id}" value="A">
                        ${question.option_a}
                    </label><br>

                    <label>
                        <input type="radio" name="question${question.id}" value="B">
                        ${question.option_b}
                    </label><br>

                    <label>
                        <input type="radio" name="question${question.id}" value="C">
                        ${question.option_c}
                    </label><br>

                    <label>
                        <input type="radio" name="question${question.id}" value="D">
                        ${question.option_d}
                    </label><br>
                `;

                quizForm.appendChild(questionDiv);
            });

            const submitButton = document.createElement("button");
            submitButton.type = "submit";
            submitButton.textContent = "Submit Quiz";

            quizForm.appendChild(submitButton);

            // Start timer after questions are loaded
            const duration = Number(data.duration || data.quiz.duration_minutes);

            if (!Number.isInteger(duration) || duration <= 0) {
                throw new Error("Invalid quiz duration.");
            }

            startTimer(duration);

        } catch (error) {
            console.error("Quiz loading error:", error);
            alert(error.message);
            window.location.href = "dashboard.html";
        }
    }

    // Submit quiz
    async function submitQuiz(isAutomatic = false) {

        if (isSubmitting) {
            return;
        }

        const answers = [];

        for (const question of questions) {

            const selectedOption = document.querySelector(
                `input[name="question${question.id}"]:checked`
            );

            if (!selectedOption && !isAutomatic) {
                alert("Please answer all questions before submitting.");
                return;
            }

            answers.push({
                questionId: question.id,
                answer: selectedOption ? selectedOption.value : ""
            });
        }

        // Ask for submission confirmation only for manual submission
        if (!isAutomatic) {

            const confirmed = confirm(
                "Are you sure you want to submit this quiz?\n\n" +
                "After submission, you cannot change your answers."
            );

            if (!confirmed) {
                return;
            }
        }

        isSubmitting = true;

        clearInterval(timerInterval);

        const submitButton = quizForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
        }

        try {
            const response = await fetch(`/quiz/${quizId}/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    studentId: Number(studentId),
                    answers: answers
                })
            });

            const data = await response.json();

            if (!response.ok) {
                isSubmitting = false;

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Submit Quiz";
                }

                alert(data.message || "Quiz submission failed.");
                return;
            }

            // Display result
            quizInfo.style.display = "none";
            quizForm.style.display = "none";

            resultDiv.innerHTML = `
                <h2>Quiz Completed!</h2>
                <h3>Your Score: ${data.score} / ${data.totalMarks}</h3>
                <p>${data.message}</p>
                <button onclick="window.location.href='dashboard.html'">
                    Back to Dashboard
                </button>
            `;

            resultDiv.style.display = "block";

        } catch (error) {
            console.error("Quiz submission error:", error);

            isSubmitting = false;

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Submit Quiz";
            }

            alert("Unable to submit quiz. Please try again.");
        }
    }

    // Handle manual submission
    quizForm.addEventListener("submit", (event) => {
        event.preventDefault();
        submitQuiz(false);
    });

    // Start loading quiz
    loadQuiz();

});
