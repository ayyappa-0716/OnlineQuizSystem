
const Database = require("better-sqlite3");

const db = new Database("quiz_system.db");

// Enable foreign keys
db.pragma("foreign_keys = ON");


// ===============================
// STUDENTS TABLE
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`).run();

console.log("Students table created successfully!");


// ===============================
// ADMINS TABLE
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
`).run();

console.log("Admins table created successfully!");


// ===============================
// QUIZZES TABLE
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS quizzes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        total_marks INTEGER NOT NULL
    )
`).run();

// Add duration column if it does not exist
const quizColumns = db.prepare(
    "PRAGMA table_info(quizzes)"
).all();

if (!quizColumns.some(column => column.name === "duration_minutes")) {
    db.exec(`
        ALTER TABLE quizzes
        ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 30
    `);

    console.log("Quiz duration column added successfully!");
}

console.log("Quizzes table created successfully!");


// ===============================
// QUESTIONS TABLE
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id INTEGER NOT NULL,
        question TEXT NOT NULL,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    )
`).run();

// Check and update questions table
const questionColumns = db.prepare(
    "PRAGMA table_info(questions)"
).all();

const requiredColumns = {
    question: "TEXT",
    option_a: "TEXT",
    option_b: "TEXT",
    option_c: "TEXT",
    option_d: "TEXT",
    correct_answer: "TEXT"
};

for (const [column, type] of Object.entries(requiredColumns)) {
    const exists = questionColumns.some(
        col => col.name === column
    );

    if (!exists) {
        db.exec(`
            ALTER TABLE questions
            ADD COLUMN ${column} ${type}
        `);

        console.log(`${column} column added successfully!`);
    }
}

console.log("Questions table created successfully!");


// ===============================
// QUIZ ATTEMPTS TABLE
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        quiz_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'submitted',

        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    )
`).run();

console.log("Quiz attempts table created successfully!");


// ===============================
// ANSWERS TABLE
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        selected_answer TEXT,
        is_correct INTEGER NOT NULL DEFAULT 0,
        marks_awarded INTEGER NOT NULL DEFAULT 0,

        FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
    )
`).run();

console.log("Answers table created successfully!");


// ===============================
// RESULTS TABLE
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        quiz_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    )
`).run();

console.log("Results table created successfully!");


// ===============================
// INSERT SAMPLE QUIZ IF EMPTY
// ===============================

const quizCount = db.prepare(`
    SELECT COUNT(*) AS count FROM quizzes
`).get();

if (quizCount.count === 0) {

    const quiz = db.prepare(`
        INSERT INTO quizzes
        (title, description, total_marks)
        VALUES (?, ?, ?)
    `).run(
        "Basic Computer Knowledge",
        "Test your basic computer knowledge.",
        5
    );

    const quizId = quiz.lastInsertRowid;

    const insertQuestion = db.prepare(`
        INSERT INTO questions
        (
            quiz_id,
            question,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertQuestion.run(
        quizId,
        "What does CPU stand for?",
        "Central Processing Unit",
        "Computer Personal Unit",
        "Central Program Utility",
        "Control Processing Unit",
        "A"
    );

    insertQuestion.run(
        quizId,
        "Which device is used to input text?",
        "Monitor",
        "Keyboard",
        "Printer",
        "Speaker",
        "B"
    );

    insertQuestion.run(
        quizId,
        "Which of the following is an operating system?",
        "Google",
        "Windows",
        "Intel",
        "HTML",
        "B"
    );

    insertQuestion.run(
        quizId,
        "What is the full form of RAM?",
        "Read Access Memory",
        "Random Access Memory",
        "Run Access Memory",
        "Real Application Memory",
        "B"
    );

    insertQuestion.run(
        quizId,
        "Which device displays computer output?",
        "Mouse",
        "Keyboard",
        "Monitor",
        "Scanner",
        "C"
    );

    console.log("Sample quiz and questions inserted successfully!");
}


// ===============================
// EXPORT DATABASE
// ===============================

module.exports = db;
