require("dotenv").config();

const session = require("express-session");
const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const db = require("./database");

const app = express();
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 1000
    }
}));
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to check admin authentication
function requireAdmin(req, res, next) {


    if (!req.session || !req.session.admin) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Please login as admin."
        });
    }

    next();
}

// Protect all admin API routes
app.use("/admin", requireAdmin);

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));


// Password strength validation
function isStrongPassword(password) {
    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

// ==========================================
// STUDENT REGISTRATION
// ==========================================

app.post("/register", async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;
        if (!isStrongPassword(password)) {
    return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
    });
}

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all fields."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

        const existingStudent = db.prepare(
            "SELECT id FROM students WHERE email = ?"
        ).get(email);

        if (existingStudent) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.prepare(`
            INSERT INTO students (name, email, password)
            VALUES (?, ?, ?)
        `).run(name, email, hashedPassword);

        res.status(201).json({
            success: true,
            message: "Registration successful!"
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
});


// ==========================================
// STUDENT LOGIN
// ==========================================

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });
        }

        const student = db.prepare(
            "SELECT * FROM students WHERE email = ?"
        ).get(email);

        if (!student) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            student.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        res.json({
            success: true,
            message: "Login successful!",
            student: {
                id: student.id,
                name: student.name,
                email: student.email
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
});


// ==========================================
// GET ALL QUIZZES
// ==========================================

app.get("/quizzes", (req, res) => {
    try {
        const quizzes = db.prepare(`
            SELECT id, title, description, total_marks
            FROM quizzes
            ORDER BY id DESC
        `).all();

        res.json({
            success: true,
            quizzes
        });

    } catch (error) {
        console.error("Load quizzes error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load quizzes."
        });
    }
});


// ==========================================
// GET QUESTIONS FOR A QUIZ
// ==========================================


app.get("/quiz/:id/questions", (req, res) => {
    try {
        const quizId = Number(req.params.id);

        const quiz = db.prepare(
            "SELECT id, title, description, total_marks, duration_minutes FROM quizzes WHERE id = ?"
        ).get(quizId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found."
            });
        }

        const questions = db.prepare(`
            SELECT id, question_text, option_a, option_b,
                   option_c, option_d, marks
            FROM questions
            WHERE quiz_id = ?
        `).all(quizId);

        res.json({
            success: true,
            quiz: quiz,
            duration: quiz.duration_minutes,
            questions: questions
        });

    } catch (error) {
        console.error("Load questions error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load questions."
        });
    }
});


// ==========================================
// SUBMIT QUIZ AND SAVE RESULT
// ==========================================


app.post("/quiz/:id/submit", (req, res) => {
    try {
        const quizId = Number(req.params.id);
        const { studentId, answers } = req.body;

        // Validate student ID
        if (!Number.isInteger(studentId) || studentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        // Check student
        const student = db.prepare(
            "SELECT id FROM students WHERE id = ?"
        ).get(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        // Check quiz
        const quiz = db.prepare(
            "SELECT id FROM quizzes WHERE id = ?"
        ).get(quizId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found."
            });
        }

        // Get quiz questions
        const questions = db.prepare(`
            SELECT id, correct_answer, marks
            FROM questions
            WHERE quiz_id = ?
        `).all(quizId);

        if (questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "This quiz has no questions."
            });
        }

        // Validate answers
        if (
            !Array.isArray(answers) ||
            answers.length !== questions.length
        ) {
            return res.status(400).json({
                success: false,
                message: "Please answer all questions."
            });
        }

        const answerMap = new Map();

        for (const item of answers) {
            if (
                !item ||
                !Number.isInteger(item.questionId) ||
                !["A", "B", "C", "D"].includes(item.answer) ||
                answerMap.has(item.questionId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid or duplicate answers."
                });
            }

            answerMap.set(item.questionId, item.answer);
        }

        // Calculate score
        let score = 0;
        let totalMarks = 0;

        const answerRecords = [];

        for (const question of questions) {
            const selectedAnswer = answerMap.get(question.id);

            if (!selectedAnswer) {
                return res.status(400).json({
                    success: false,
                    message: "Please answer all questions."
                });
            }

            const marks = Number(question.marks) || 1;

            const isCorrect =
                selectedAnswer === question.correct_answer.toUpperCase();

            const marksAwarded = isCorrect ? marks : 0;

            totalMarks += marks;
            score += marksAwarded;

            answerRecords.push({
                questionId: question.id,
                selectedAnswer,
                isCorrect: isCorrect ? 1 : 0,
                marksAwarded
            });
        }

        // Save attempt, answers and result together
        const saveSubmission = db.transaction(() => {

            // Save quiz attempt
            const attempt = db.prepare(`
                INSERT INTO quiz_attempts
                (student_id, quiz_id, score, total_marks, status)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                studentId,
                quizId,
                score,
                totalMarks,
                "submitted"
            );

            const attemptId = Number(attempt.lastInsertRowid);

            // Save individual answers
            const insertAnswer = db.prepare(`
                INSERT INTO answers
                (
                    attempt_id,
                    question_id,
                    selected_answer,
                    is_correct,
                    marks_awarded
                )
                VALUES (?, ?, ?, ?, ?)
            `);

            for (const answer of answerRecords) {
                insertAnswer.run(
                    attemptId,
                    answer.questionId,
                    answer.selectedAnswer,
                    answer.isCorrect,
                    answer.marksAwarded
                );
            }

            // Save existing result record
            const result = db.prepare(`
                INSERT INTO results
                (student_id, quiz_id, score, total_marks)
                VALUES (?, ?, ?, ?)
            `).run(
                studentId,
                quizId,
                score,
                totalMarks
            );

            return {
                attemptId,
                resultId: Number(result.lastInsertRowid)
            };
        });

        const savedData = saveSubmission();

        // Send response
        res.json({
            success: true,
            message: "Quiz submitted and result saved successfully!",
            attemptId: savedData.attemptId,
            resultId: savedData.resultId,
            score,
            totalMarks
        });

    } catch (error) {
        console.error("Submit quiz error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to submit quiz."
        });
    }
});


// ==========================================
// GET RESULTS FOR A STUDENT
// ==========================================

app.get("/results/:studentId", (req, res) => {
    try {
        const studentId = Number(req.params.studentId);

        const results = db.prepare(`
            SELECT
                results.id,
                quizzes.title AS quiz_title,
                results.score,
                results.total_marks,
                results.submitted_at
            FROM results
            JOIN quizzes ON results.quiz_id = quizzes.id
            WHERE results.student_id = ?
            ORDER BY results.id DESC
        `).all(studentId);

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error("Student results error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load results."
        });
    }
});


// ==========================================
// ADMIN REGISTRATION
// ==========================================

// Disable public admin registration
app.post("/admin-register", (req, res) => {
    return res.status(403).json({
        message: "Admin registration is disabled. Contact the project owner."
    });
});

// ==========================================
// ADMIN LOGIN
// ==========================================


app.post("/admin-login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter email and password."
            });
        }

        const admin = db.prepare(
            "SELECT * FROM admins WHERE email = ?"
        ).get(email);

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Create admin session
        req.session.admin = {
            id: admin.id,
            name: admin.name,
            email: admin.email
        };

        req.session.save((error) => {
            if (error) {
                console.error("Session error:", error);

                return res.status(500).json({
                    success: false,
                    message: "Could not create admin session."
                });
            }

            res.json({
                success: true,
                message: "Admin login successful!",
                admin: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email
                }
            });
        });

    } catch (error) {
        console.error("Admin login error:", error);

        res.status(500).json({
            success: false,
            message: "Admin login failed."
        });
    }
});



// ==========================================
// ADMIN: ADD NEW QUIZ
// ==========================================

app.post("/admin/add-quiz", requireAdmin, (req, res) => {
    try {
        const { adminId, title, description, totalMarks, duration } = req.body;

        const admin = db.prepare(
            "SELECT id FROM admins WHERE id = ?"
        ).get(adminId);

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin."
            });
        }

        if (
            !title ||
            !description ||
            Number(totalMarks) <= 0 ||
            !Number.isInteger(Number(duration)) ||
            Number(duration) < 1 ||
            Number(duration) > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter valid quiz details."
            });
        }

        db.prepare(`
            INSERT INTO quizzes
            (title, description, total_marks, duration_minutes)
            VALUES (?, ?, ?, ?)
        `).run(
            title,
            description,
            Number(totalMarks),
            Number(duration)
        );

        res.status(201).json({
            success: true,
            message: "Quiz added successfully!"
        });

    } catch (error) {
        console.error("Add quiz error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to add quiz."
        });
    }
});



// ==========================================
// ADMIN: ADD QUESTION
// ==========================================

app.post("/admin/add-question", requireAdmin, (req, res) => {
    try {
        const {
            adminId,
            quizId,
            questionText,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer
        } = req.body;

        const admin = db.prepare(
            "SELECT id FROM admins WHERE id = ?"
        ).get(adminId);

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin."
            });
        }

        if (
            !quizId ||
            !questionText ||
            !optionA ||
            !optionB ||
            !optionC ||
            !optionD ||
            !["A", "B", "C", "D"].includes(correctAnswer)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all question fields correctly."
            });
        }

        const quiz = db.prepare(
            "SELECT id FROM quizzes WHERE id = ?"
        ).get(quizId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found."
            });
        }

        db.prepare(`
            INSERT INTO questions
            (
                quiz_id,
                question,
                question_text,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer,
                marks
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            quizId,
            questionText,
            questionText,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            1
        );
        
        res.status(201).json({
            success: true,
            message: "Question added successfully!"
        });

    } catch (error) {
        console.error("Add question error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to add question."
        });
    }
});


// ==========================================
// ADMIN: VIEW ALL STUDENTS
// ==========================================

app.get("/admin/students", requireAdmin, (req, res) => {
    try {
        const students = db.prepare(`
            SELECT id, name, email
            FROM students
            ORDER BY id DESC
        `).all();

        res.json({
            success: true,
            students
        });

    } catch (error) {
        console.error("View students error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load students."
        });
    }
});


// ==========================================
// ADMIN: VIEW ALL QUIZ RESULTS
// ==========================================

app.get("/admin/all-results", requireAdmin, (req, res) => {
    try {
        const results = db.prepare(`
            SELECT
                results.id,
                students.name AS student_name,
                students.email AS student_email,
                quizzes.title AS quiz_title,
                results.score,
                results.total_marks,
                results.submitted_at
            FROM results
            JOIN students ON results.student_id = students.id
            JOIN quizzes ON results.quiz_id = quizzes.id
            ORDER BY results.id DESC
        `).all();

        res.json({
            success: true,
            results
        });

    } catch (error) {
        console.error("View all results error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load quiz results."
        });
    }
});


// ==========================================
// ADMIN: DELETE QUESTION
// ==========================================


app.post("/admin/add-quiz", requireAdmin, (req, res) => {
    try {
        const { adminId, title, description, totalMarks, duration } = req.body;

        const admin = db.prepare(
            "SELECT id FROM admins WHERE id = ?"
        ).get(adminId);

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin."
            });
        }

        const marks = Number(totalMarks);
        const quizDuration = Number(duration);

        if (
            !title ||
            !description ||
            !Number.isInteger(marks) ||
            marks <= 0 ||
            !Number.isInteger(quizDuration) ||
            quizDuration < 1 ||
            quizDuration > 180
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter valid quiz details. Duration must be between 1 and 180 minutes."
            });
        }

        db.prepare(`
            INSERT INTO quizzes
            (title, description, total_marks, duration_minutes)
            VALUES (?, ?, ?, ?)
        `).run(title.trim(), description.trim(), marks, quizDuration);

        res.status(201).json({
            success: true,
            message: "Quiz added successfully!"
        });

    } catch (error) {
        console.error("Add quiz error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to add quiz."
        });
    }
});



// ==========================================
// ADMIN: DELETE QUIZ
// ==========================================

app.post("/admin/delete-quiz", requireAdmin, (req, res) => {
    try {
        const { adminId, quizId } = req.body;

        const admin = db.prepare(
            "SELECT id FROM admins WHERE id = ?"
        ).get(adminId);

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin."
            });
        }

        const quiz = db.prepare(
            "SELECT id FROM quizzes WHERE id = ?"
        ).get(quizId);

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: "Quiz not found."
            });
        }

        const existingResults = db.prepare(
            "SELECT id FROM results WHERE quiz_id = ? LIMIT 1"
        ).get(quizId);

        if (existingResults) {
            return res.status(400).json({
                success: false,
                message: "This quiz cannot be deleted because students have already attempted it."
            });
        }

        const deleteQuizTransaction = db.transaction(() => {
            db.prepare(
                "DELETE FROM questions WHERE quiz_id = ?"
            ).run(quizId);

            db.prepare(
                "DELETE FROM quizzes WHERE id = ?"
            ).run(quizId);
        });

        deleteQuizTransaction();

        res.json({
            success: true,
            message: "Quiz deleted successfully!"
        });

    } catch (error) {
        console.error("Delete quiz error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to delete quiz."
        });
    }
});


// ==========================================
// ADMIN: DASHBOARD STATISTICS
// ==========================================

app.get("/admin/dashboard-stats", requireAdmin, (req, res) => {
    try {
        const totalStudents = db.prepare(
            "SELECT COUNT(*) AS count FROM students"
        ).get().count;

        const totalQuizzes = db.prepare(
            "SELECT COUNT(*) AS count FROM quizzes"
        ).get().count;

        const totalQuestions = db.prepare(
            "SELECT COUNT(*) AS count FROM questions"
        ).get().count;

        const totalAttempts = db.prepare(
            "SELECT COUNT(*) AS count FROM results"
        ).get().count;

        res.json({
            success: true,
            totalStudents,
            totalQuizzes,
            totalQuestions,
            totalAttempts
        });

    } catch (error) {
        console.error("Dashboard statistics error:", error);
        res.status(500).json({
            success: false,
            message: "Unable to load dashboard statistics."
        });
    }
});


// ==========================================
// START SERVER
// ==========================================

// Admin logout
app.post("/admin/logout", (req, res) => {

    // Check whether an admin is logged in
    if (!req.session.admin) {
        return res.status(401).json({
            success: false,
            message: "Please login as admin."
        });
    }

    req.session.destroy((err) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: "Unable to logout."
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            success: true,
            message: "Admin logged out successfully."
        });

    });

});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});