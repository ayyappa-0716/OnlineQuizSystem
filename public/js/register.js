document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("registerForm");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const passwordMatchMessage = document.getElementById("passwordMatchMessage");

    console.log("Registration JavaScript loaded!");
    console.log("Password input:", passwordInput);
    console.log("Length check:", document.getElementById("lengthCheck"));

    if (!form) {
        console.error("Registration form not found!");
        return;
    }

    // =====================================
    // LIVE PASSWORD VALIDATION
    // =====================================

    passwordInput.addEventListener("input", () => {

        const password = passwordInput.value;

        function updateCheck(id, isValid) {

            const element = document.getElementById(id);

            if (!element) return;

            const originalText = element.textContent.substring(2);

            element.style.color = isValid ? "green" : "gray";

            element.textContent =
                (isValid ? "✓ " : "○ ") + originalText;
        }

        updateCheck("lengthCheck", password.length >= 8);
        updateCheck("upperCheck", /[A-Z]/.test(password));
        updateCheck("lowerCheck", /[a-z]/.test(password));
        updateCheck("numberCheck", /[0-9]/.test(password));
        updateCheck("specialCheck", /[^A-Za-z0-9]/.test(password));

    });

    // =====================================
   // LIVE CONFIRM PASSWORD VALIDATION
// =====================================

function checkPasswordMatch() {

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (confirmPassword.length === 0) {
        passwordMatchMessage.textContent = "";
        return;
    }

    if (password === confirmPassword) {

        passwordMatchMessage.textContent = "✓ Passwords match!";
        passwordMatchMessage.style.color = "green";

    } else {

        passwordMatchMessage.textContent = "✗ Passwords do not match!";
        passwordMatchMessage.style.color = "red";

    }
}

passwordInput.addEventListener("input", checkPasswordMatch);
confirmPasswordInput.addEventListener("input", checkPasswordMatch);


    // =====================================
    // STUDENT REGISTRATION
    // =====================================

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = passwordInput.value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!name || !email || !password || !confirmPassword) {
            alert("Please fill in all fields.");
            return;
        }

        // Check password strength
        const strongPassword =
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password);

        if (!strongPassword) {
            alert("Please follow all password requirements.");
            return;
        }

        // Check password matching
        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {

            const response = await fetch("/register", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password,
                    confirmPassword: confirmPassword
                })
            });

            const data = await response.json();

            if (response.ok) {

                alert("Registration successful! Welcome to Online Quiz System.");

                form.reset();

                // Reset password requirement indicators
                passwordInput.dispatchEvent(new Event("input"));

            } else {

                alert("Registration failed: " + data.message);

            }

        } catch (error) {

            console.error("Registration error:", error);

            alert("Unable to connect to the server. Please try again.");

        }

    });

    // =====================================
// SHOW / HIDE PASSWORD
// =====================================

function togglePassword(inputId, button) {

    const passwordField = document.getElementById(inputId);

    if (passwordField.type === "password") {

        passwordField.type = "text";
        button.textContent = "Hide";

    } else {

        passwordField.type = "password";
        button.textContent = "Show";

    }
}

// Make function available to HTML onclick
window.togglePassword = togglePassword;

});
