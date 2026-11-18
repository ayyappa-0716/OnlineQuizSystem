
const studentId = localStorage.getItem("studentId");
const studentName = localStorage.getItem("studentName");

if (!studentId) {
    window.location.href = "login.html";
} else {
    document.getElementById("welcomeMessage").textContent =
        "Welcome, " + (studentName || "Student");

    loadResults();
}

async function loadResults() {

    const resultsList = document.getElementById("resultsList");

    try {

        const response = await fetch(`/results/${studentId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load results.");
        }

        resultsList.innerHTML = "";

        const results = data.results || [];

        if (results.length === 0) {
            resultsList.textContent =
                "You have not attempted any quizzes yet.";

            return;
        }

        let passed = 0;
        let failed = 0;
        let totalPercentage = 0;

        results.forEach(result => {

            const percentage = result.total_marks > 0
                ? (result.score / result.total_marks) * 100
                : 0;

            totalPercentage += percentage;

            const status = percentage >= 40 ? "PASS" : "FAIL";

            if (status === "PASS") {
                passed++;
            } else {
                failed++;
            }

            const resultCard = document.createElement("div");
            resultCard.className = "result-card";

            const title = document.createElement("h3");
            title.textContent = result.quiz_title;

            const score = document.createElement("p");
            score.textContent =
                `Score: ${result.score} / ${result.total_marks}`;

            const percentageText = document.createElement("p");
            percentageText.textContent =
                `Percentage: ${percentage.toFixed(2)}%`;

            const statusText = document.createElement("p");
            statusText.textContent = `Status: ${status}`;
            statusText.style.fontWeight = "bold";
            statusText.style.color =
                status === "PASS" ? "green" : "red";

            const date = document.createElement("p");
            date.textContent = "Submitted: " +
                (result.submitted_at
                    ? new Date(result.submitted_at).toLocaleString()
                    : "Not available");

            resultCard.appendChild(title);
            resultCard.appendChild(score);
            resultCard.appendChild(percentageText);
            resultCard.appendChild(statusText);
            resultCard.appendChild(date);

            resultsList.appendChild(resultCard);

        });

        const averagePercentage =
            totalPercentage / results.length;

        document.getElementById("totalAttempts").textContent =
            results.length;

        document.getElementById("passedQuizzes").textContent =
            passed;

        document.getElementById("failedQuizzes").textContent =
            failed;

        document.getElementById("averagePercentage").textContent =
            averagePercentage.toFixed(2) + "%";

    } catch (error) {

        console.error("Results loading error:", error);
        resultsList.textContent = error.message;

    }
}
