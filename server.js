const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

const JWT_SECRET = process.env.JWT_SECRET || "jobfinder_secret_12345";


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));


// ===============================
// SERVE FRONTEND
// ===============================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ===============================
// DATABASE
// ===============================

const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;

let dbPath;

if (isVercel) {
    dbPath = path.join(os.tmpdir(), "jobfinder.db");
    const packagedDb = path.join(__dirname, "database", "jobfinder.db");
    if (fs.existsSync(packagedDb) && !fs.existsSync(dbPath)) {
        try {
            fs.copyFileSync(packagedDb, dbPath);
        } catch (copyErr) {
            console.warn("Could not copy initial database to tmp:", copyErr.message);
        }
    }
} else {
    const dbDir = path.join(__dirname, "database");
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    dbPath = path.join(dbDir, "jobfinder.db");
}

const db = new sqlite3.Database(
    dbPath,
    (err) => {

        if (err) {

            console.error(
                "Database connection failed:",
                err.message
            );

        } else {

            console.log(
                `Connected to SQLite database at ${dbPath}`
            );

        }
    }
);


// ===============================
// CREATE USERS TABLE
// ===============================

db.run(`
    CREATE TABLE IF NOT EXISTS users (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        name TEXT NOT NULL,

        email TEXT UNIQUE NOT NULL,

        password TEXT NOT NULL,

        location TEXT,

        industry TEXT,

        salary_min INTEGER,

        salary_max INTEGER,

        skills TEXT,

        created_at DATETIME
        DEFAULT CURRENT_TIMESTAMP

    )
`, (err) => {

    if (err) {

        console.error(
            "Users table error:",
            err.message
        );

    } else {

        console.log(
            "Users table ready"
        );

    }

});


// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


// ===============================
// REGISTER
// ===============================

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        // Check fields

        if (
            !name ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                message:
                    "Please fill all fields"

            });

        }


        // Check password length

        if (password.length < 6) {

            return res.status(400).json({

                message:
                    "Password must contain at least 6 characters"

            });

        }


        // Hash password

        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        // Save user

        db.run(
            `
            INSERT INTO users
            (name, email, password)
            VALUES (?, ?, ?)
            `,
            [
                name,
                email,
                hashedPassword
            ],
            function (err) {

                if (err) {

                    if (
                        err.message.includes(
                            "UNIQUE"
                        )
                    ) {

                        return res
                            .status(409)
                            .json({

                                message:
                                    "Email already registered"

                            });

                    }


                    console.error(err);

                    return res
                        .status(500)
                        .json({

                            message:
                                "Registration failed"

                        });

                }


                res.json({

                    message:
                        "Registration successful",

                    userId:
                        this.lastID

                });

            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Server error"

        });

    }

});


// ===============================
// LOGIN
// ===============================

app.post("/api/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    if (!email || !password) {

        return res.status(400).json({

            message:
                "Please enter email and password"

        });

    }


    db.get(
        `
        SELECT *
        FROM users
        WHERE email = ?
        `,
        [email],
        async (err, user) => {

            if (err) {

                return res.status(500).json({

                    message:
                        "Database error"

                });

            }


            if (!user) {

                return res.status(401).json({

                    message:
                        "Invalid email or password"

                });

            }


            const passwordMatch =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordMatch) {

                return res.status(401).json({

                    message:
                        "Invalid email or password"

                });

            }


            const token =
                jwt.sign(

                    {
                        id: user.id,

                        email: user.email
                    },

                    JWT_SECRET,

                    {
                        expiresIn: "7d"
                    }

                );


            res.json({

                message:
                    "Login successful",

                token: token,

                user: {

                    id: user.id,

                    name: user.name,

                    email: user.email

                }

            });

        }
    );

});


// ===============================
// AUTHENTICATION MIDDLEWARE
// ===============================

function authenticate(
    req,
    res,
    next
) {

    const authHeader =
        req.headers.authorization;


    if (!authHeader) {

        return res.status(401).json({

            message:
                "Authentication required"

        });

    }


    const token =
        authHeader.split(" ")[1];


    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        req.user = decoded;


        next();

    } catch (error) {

        return res.status(401).json({

            message:
                "Invalid or expired token"

        });

    }

}


// ===============================
// GET USER PROFILE
// ===============================

app.get(
    "/api/profile",
    authenticate,
    (req, res) => {

        db.get(
            `
            SELECT
                id,
                name,
                email,
                location,
                industry,
                salary_min,
                salary_max,
                skills
            FROM users
            WHERE id = ?
            `,
            [req.user.id],
            (err, user) => {

                if (err) {

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error"

                        });

                }


                res.json(user);

            }
        );

    }
);




// ===============================
// APPLICATIONS TABLE
// ===============================

db.run(`
    CREATE TABLE IF NOT EXISTS applications (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        job_id INTEGER NOT NULL,

        status TEXT DEFAULT 'Applied',

        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id) REFERENCES users(id),

        FOREIGN KEY (job_id) REFERENCES jobs(id),

        UNIQUE(user_id, job_id)

    )
`, (err) => {

    if (err) {

        console.error(
            "Applications table error:",
            err.message
        );

    } else {

        console.log(
            "Applications table ready"
        );

    }

});


// ===============================
// APPLY FOR A JOB
// ===============================

app.post(
    "/api/applications",
    authenticate,
    (req, res) => {

        const { jobId } = req.body;

        if (!jobId) {
            return res.status(400).json({
                message: "Job ID is required"
            });
        }

        // Check that the job exists
        db.get(
            `
            SELECT id
            FROM jobs
            WHERE id = ?
            `,
            [jobId],
            (err, job) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        message: "Database error"
                    });

                }

                if (!job) {

                    return res.status(404).json({
                        message: "Job not found"
                    });

                }

                // Apply for job
                db.run(
                    `
                    INSERT INTO applications
                    (
                        user_id,
                        job_id,
                        status
                    )
                    VALUES (?, ?, 'Applied')
                    `,
                    [
                        req.user.id,
                        jobId
                    ],
                    function (err) {

                        if (err) {

                            console.error(err);

                            if (
                                err.message.includes("UNIQUE")
                            ) {

                                return res.status(409).json({
                                    message:
                                        "You have already applied for this job."
                                });

                            }

                            return res.status(500).json({
                                message:
                                    "Could not submit application"
                            });

                        }

                        res.json({

                            message:
                                "Application submitted successfully!",

                            applicationId:
                                this.lastID

                        });

                    }
                );

            }
        );

    }
);

// ===============================
// GET USER APPLICATIONS
// ===============================

app.get(
    "/api/applications",
    authenticate,
    (req, res) => {

        const sql = `

            SELECT

                applications.id,

                applications.status,

                applications.applied_at,

                jobs.id AS job_id,

                jobs.title,

                jobs.company,

                jobs.location,

                jobs.industry,

                jobs.salary_min,

                jobs.salary_max

            FROM applications

            INNER JOIN jobs

                ON applications.job_id = jobs.id

            WHERE applications.user_id = ?

            ORDER BY applications.applied_at DESC

        `;


        db.all(
            sql,
            [req.user.id],
            (err, applications) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        message:
                            "Could not load applications"

                    });

                }


                res.json(applications);

            }
        );

    }
);


// ===============================
// UPDATE APPLICATION STATUS
// ===============================

app.put(
    "/api/applications/:id",
    authenticate,
    (req, res) => {

        const applicationId =
            req.params.id;

        const { status } =
            req.body;


        const allowedStatuses = [

            "Applied",

            "Reviewing",

            "Interview",

            "Selected",

            "Rejected"

        ];


        if (
            !allowedStatuses.includes(status)
        ) {

            return res.status(400).json({

                message:
                    "Invalid application status"

            });

        }


        db.run(
            `
            UPDATE applications

            SET status = ?

            WHERE id = ?

            AND user_id = ?

            `,
            [
                status,
                applicationId,
                req.user.id
            ],
            function (err) {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        message:
                            "Could not update status"

                    });

                }


                if (this.changes === 0) {

                    return res.status(404).json({

                        message:
                            "Application not found"

                    });

                }


                res.json({

                    message:
                        "Application status updated"

                });

            }
        );

    }
);

// ===============================
// USER PROFILES TABLE
// ===============================

db.run(`
    CREATE TABLE IF NOT EXISTS profiles (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL UNIQUE,

        full_name TEXT,

        phone TEXT,

        location TEXT,

        skills TEXT,

        industry TEXT,

        min_salary INTEGER,

        max_salary INTEGER,

        about TEXT,

        updated_at DATETIME
            DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)

    )
`, (err) => {

    if (err) {

        console.error(
            "Profiles table error:",
            err.message
        );

    } else {

        console.log(
            "Profiles table ready"
        );

    }

});

// ===============================
// GET USER PROFILE
// ===============================

app.get(
    "/api/profile",
    authenticate,
    (req, res) => {

        db.get(
            `
            SELECT *

            FROM profiles

            WHERE user_id = ?
            `,
            [req.user.id],
            (err, profile) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({

                        message:
                            "Could not load profile"

                    });

                }


                if (!profile) {

                    return res.json({

                        full_name: "",
                        phone: "",
                        location: "",
                        skills: "",
                        industry: "",
                        min_salary: "",
                        max_salary: "",
                        about: ""

                    });

                }


                res.json(profile);

            }
        );

    }
);


// ===============================
// SAVE / UPDATE USER PROFILE
// ===============================

app.put(
    "/api/profile",
    authenticate,
    (req, res) => {

        console.log("Saving profile...");
        console.log("User:", req.user);
        console.log("Profile data:", req.body);

        const {
            full_name,
            phone,
            location,
            skills,
            industry,
            min_salary,
            max_salary,
            about
        } = req.body;


        // Get user ID safely
        const userId =
            req.user.id || req.user.userId;


        if (!userId) {

            console.error("User ID not found");

            return res.status(401).json({

                message: "User ID not found. Please login again."

            });

        }


        // Check whether profile already exists
        db.get(
            `
            SELECT id
            FROM profiles
            WHERE user_id = ?
            `,
            [userId],

            (err, existingProfile) => {

                if (err) {

                    console.error(
                        "Profile check error:",
                        err.message
                    );

                    return res.status(500).json({

                        message:
                            "Database error while checking profile",

                        error:
                            err.message

                    });

                }


                // ===============================
                // UPDATE EXISTING PROFILE
                // ===============================

                if (existingProfile) {

                    db.run(
                        `
                        UPDATE profiles

                        SET
                            full_name = ?,
                            phone = ?,
                            location = ?,
                            skills = ?,
                            industry = ?,
                            min_salary = ?,
                            max_salary = ?,
                            about = ?,
                            updated_at = CURRENT_TIMESTAMP

                        WHERE user_id = ?
                        `,

                        [
                            full_name || "",
                            phone || "",
                            location || "",
                            skills || "",
                            industry || "",
                            min_salary || null,
                            max_salary || null,
                            about || "",
                            userId
                        ],

                        function (err) {

                            if (err) {

                                console.error(
                                    "Profile update error:",
                                    err.message
                                );

                                return res.status(500).json({

                                    message:
                                        "Could not update profile",

                                    error:
                                        err.message

                                });

                            }


                            console.log(
                                "Profile updated successfully"
                            );


                            return res.json({

                                message:
                                    "Profile saved successfully"

                            });

                        }
                    );

                }


                // ===============================
                // CREATE NEW PROFILE
                // ===============================

                else {

                    db.run(
                        `
                        INSERT INTO profiles
                        (
                            user_id,
                            full_name,
                            phone,
                            location,
                            skills,
                            industry,
                            min_salary,
                            max_salary,
                            about
                        )

                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `,

                        [
                            userId,
                            full_name || "",
                            phone || "",
                            location || "",
                            skills || "",
                            industry || "",
                            min_salary || null,
                            max_salary || null,
                            about || ""
                        ],

                        function (err) {

                            if (err) {

                                console.error(
                                    "Profile insert error:",
                                    err.message
                                );

                                return res.status(500).json({

                                    message:
                                        "Could not create profile",

                                    error:
                                        err.message

                                });

                            }


                            console.log(
                                "Profile created successfully"
                            );


                            return res.json({

                                message:
                                    "Profile saved successfully"

                            });

                        }
                    );

                }

            }
        );

    }
);

// ===============================
// JOB ALERTS TABLE
// ===============================

db.run(`
    CREATE TABLE IF NOT EXISTS job_alerts (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        name TEXT,

        location TEXT,

        industry TEXT,

        min_salary INTEGER,

        max_salary INTEGER,

        keywords TEXT,

        active INTEGER DEFAULT 1,

        created_at DATETIME
            DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)

    )
`, (err) => {

    if (err) {

        console.error(
            "Job alerts table error:",
            err.message
        );

    } else {

        console.log(
            "Job alerts table ready"
        );

    }

});

// ===============================
// GET USER JOB ALERTS
// ===============================

app.get(
    "/api/job-alerts",
    authenticate,
    (req, res) => {

        db.all(
            `
            SELECT *

            FROM job_alerts

            WHERE user_id = ?

            ORDER BY created_at DESC
            `,
            [req.user.id],

            (err, alerts) => {

                if (err) {

                    console.error(
                        "Get alerts error:",
                        err.message
                    );

                    return res.status(500).json({

                        message:
                            "Could not load job alerts"

                    });

                }

                res.json(alerts);

            }
        );

    }
);


// ===============================
// CREATE JOB ALERT
// ===============================

app.post(
    "/api/job-alerts",
    authenticate,
    (req, res) => {

        const {

            name,
            location,
            industry,
            min_salary,
            max_salary,
            keywords

        } = req.body;


        db.run(
            `
            INSERT INTO job_alerts
            (
                user_id,
                name,
                location,
                industry,
                min_salary,
                max_salary,
                keywords,
                active
            )

            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `,

            [
                req.user.id,
                name || "My Job Alert",
                location || "",
                industry || "",
                min_salary || null,
                max_salary || null,
                keywords || ""
            ],

            function (err) {

                if (err) {

                    console.error(
                        "Create alert error:",
                        err.message
                    );

                    return res.status(500).json({

                        message:
                            "Could not create job alert",

                        error:
                            err.message

                    });

                }


                res.json({

                    message:
                        "Job alert created successfully",

                    id:
                        this.lastID

                });

            }
        );

    }
);


// ===============================
// DELETE JOB ALERT
// ===============================

app.delete(
    "/api/job-alerts/:id",
    authenticate,
    (req, res) => {

        db.run(
            `
            DELETE FROM job_alerts

            WHERE id = ?

            AND user_id = ?
            `,

            [
                req.params.id,
                req.user.id
            ],

            function (err) {

                if (err) {

                    console.error(
                        "Delete alert error:",
                        err.message
                    );

                    return res.status(500).json({

                        message:
                            "Could not delete job alert"

                    });

                }


                res.json({

                    message:
                        "Job alert deleted successfully"

                });

            }
        );

    }
);

// ===============================
// GEMINI AI JOB RECOMMENDATION
// ===============================

app.post(
    "/api/ai/recommend",
    authenticate,
    async (req, res) => {

        try {

            const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;

            // -------------------------------
            // CHECK API KEY
            // -------------------------------

            if (!apiKey) {

                return res.status(400).json({
                    message: "Gemini API key is required"
                });

            }

            // -------------------------------
            // GET USER PROFILE
            // -------------------------------

            db.get(
                `
                SELECT
                    full_name,
                    location,
                    skills,
                    industry,
                    min_salary,
                    max_salary,
                    about
                FROM profiles
                WHERE user_id = ?
                `,
                [req.user.id],

                async (profileError, profile) => {

                    if (profileError) {

                        console.error(
                            "Profile error:",
                            profileError.message
                        );

                        return res.status(500).json({
                            message: "Could not load user profile"
                        });

                    }

                    if (!profile) {

                        return res.status(404).json({
                            message: "Please complete your profile first"
                        });

                    }

                    // -------------------------------
                    // GET AVAILABLE JOBS
                    // -------------------------------

                    db.all(
                        `
                        SELECT
                            id,
                            title,
                            company,
                            location,
                            industry,
                            min_salary,
                            max_salary,
                            description,
                            apply_url
                        FROM jobs
                        ORDER BY id DESC
                        LIMIT 30
                        `,
                        [],

                        async (jobsError, jobs) => {

                            if (jobsError) {

                                console.error(
                                    "Jobs error:",
                                    jobsError.message
                                );

                                return res.status(500).json({
                                    message: "Could not load jobs"
                                });

                            }

                            if (!jobs || jobs.length === 0) {

                                return res.status(404).json({
                                    message: "No jobs available"
                                });

                            }

                            // -------------------------------
                            // CREATE AI PROMPT
                            // -------------------------------

                            const prompt = `

You are an AI job recommendation assistant.

Your task is to analyze the user's profile and recommend suitable jobs
ONLY from the AVAILABLE JOBS provided below.

IMPORTANT RULES:

- Do not invent jobs.
- Do not invent companies.
- Do not invent salaries.
- Do not invent job IDs.
- Use ONLY the job IDs provided in AVAILABLE JOBS.
- Return ONLY valid JSON.
- Do not use markdown.
- Do not include \`\`\`json.
- Do not include explanations outside the JSON.

USER PROFILE:

Name:
${profile.full_name || "Not provided"}

Location:
${profile.location || "Not provided"}

Skills:
${profile.skills || "Not provided"}

Preferred Industry:
${profile.industry || "Not provided"}

Minimum Salary:
${profile.min_salary || "Not provided"}

Maximum Salary:
${profile.max_salary || "Not provided"}

About:
${profile.about || "Not provided"}

AVAILABLE JOBS:

${JSON.stringify(jobs, null, 2)}

Return the result using EXACTLY this JSON structure:

{
    "recommendations": [
        {
            "jobId": 1,
            "matchPercentage": 85,
            "whyMatch": "Short explanation of why this job matches the user.",
            "matchingSkills": [
                "Python",
                "SQL"
            ],
            "skillsToImprove": [
                "Advanced Python",
                "Cloud"
            ]
        }
    ]
}

For matchPercentage:

- Give a number between 0 and 100.
- Base it only on the supplied user profile and job information.
- It is an AI estimate, not a guarantee.

Recommend the most relevant available jobs.

Do not make hiring decisions.
Do not claim that the user will get the job.

`;

                            // -------------------------------
                            // CALL GEMINI API
                            // -------------------------------

                            try {

                                const geminiResponse = await fetch(
                                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
                                    {
                                        method: "POST",

                                        headers: {
                                            "Content-Type": "application/json",
                                            "x-goog-api-key": apiKey
                                        },

                                        body: JSON.stringify({
                                            contents: [
                                                {
                                                    parts: [
                                                        {
                                                            text: prompt
                                                        }
                                                    ]
                                                }
                                            ]
                                        })
                                    }
                                );

                                // -------------------------------
                                // GET GEMINI RESPONSE
                                // -------------------------------

                                const geminiData =
                                    await geminiResponse.json();

                                // -------------------------------
                                // GEMINI ERROR
                                // -------------------------------

                                if (!geminiResponse.ok) {

                                    console.error(
                                        "Gemini API error:",
                                        geminiData
                                    );

                                    return res.status(
                                        geminiResponse.status
                                    ).json({
                                        message:
                                            geminiData?.error?.message ||
                                            "Gemini API request failed"
                                    });

                                }

                                // -------------------------------
                                // GET TEXT FROM GEMINI
                                // -------------------------------

                                let recommendationText =
                                    geminiData
                                        ?.candidates?.[0]
                                        ?.content?.parts
                                        ?.map(part => part.text || "")
                                        .join("")
                                        .trim();

                                if (!recommendationText) {

                                    return res.status(500).json({
                                        message:
                                            "Gemini returned an empty response"
                                    });

                                }

                                // -------------------------------
                                // REMOVE MARKDOWN
                                // -------------------------------

                                recommendationText =
                                    recommendationText
                                        .replace(/^```json\s*/i, "")
                                        .replace(/^```\s*/i, "")
                                        .replace(/```$/i, "")
                                        .trim();

                                // -------------------------------
                                // PARSE GEMINI JSON
                                // -------------------------------

                                let recommendationData;

                                try {

                                    recommendationData =
                                        JSON.parse(
                                            recommendationText
                                        );

                                } catch (error) {

                                    console.error(
                                        "Invalid Gemini JSON:",
                                        recommendationText
                                    );

                                    return res.status(500).json({
                                        message:
                                            "Gemini returned invalid JSON"
                                    });

                                }

                                // -------------------------------
                                // PREPARE RECOMMENDATIONS
                                // -------------------------------

                                const recommendations =
                                    recommendationData.recommendations || [];

                                if (
                                    !Array.isArray(
                                        recommendations
                                    )
                                ) {

                                    return res.status(500).json({
                                        message:
                                            "Invalid recommendation format"
                                    });

                                }

                                // -------------------------------
                                // SEND RESULT TO FRONTEND
                                // -------------------------------

                                return res.json({

                                    message:
                                        "Recommendations generated successfully",

                                    recommendations:
                                        recommendations

                                });

                            } catch (error) {

                                console.error(
                                    "Gemini request error:",
                                    error
                                );

                                return res.status(500).json({
                                    message:
                                        "Failed to generate AI recommendations",
                                    error:
                                        error.message
                                });

                            }

                        }
                    );

                }
            );

        } catch (error) {

            console.error(
                "AI recommendation error:",
                error
            );

            return res.status(500).json({
                message: "Server error"
            });

        }

    }
);
// ===============================
// START SERVER
// ===============================

// ===============================
// CREATE JOBS TABLE
// ===============================

db.run(`
    CREATE TABLE IF NOT EXISTS jobs (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        title TEXT NOT NULL,

        company TEXT NOT NULL,

        location TEXT NOT NULL,

        industry TEXT NOT NULL,

        salary_min INTEGER,

        salary_max INTEGER,

        description TEXT,

        apply_url TEXT,

        created_at DATETIME
        DEFAULT CURRENT_TIMESTAMP

    )
`, (err) => {

    if (err) {

        console.error(
            "Jobs table error:",
            err.message
        );

        return;
    }


    console.log("Jobs table ready");


    // ===============================
    // ADD SAMPLE JOBS AFTER TABLE
    // IS READY
    // ===============================

    const sampleJobs = [

        [
            "Python Developer",
            "Tech Solutions",
            "Bhubaneswar",
            "IT",
            400000,
            700000,
            "Python, APIs, SQL and backend development",
            "#"
        ],

        [
            "Frontend Developer",
            "Digital Labs",
            "Bangalore",
            "IT",
            500000,
            800000,
            "HTML, CSS, JavaScript and responsive web development",
            "#"
        ],

        [
            "Data Analyst",
            "Analytics Corp",
            "Hyderabad",
            "Data",
            450000,
            750000,
            "SQL, Excel, Python and data visualization",
            "#"
        ],

        [
            "Software Tester",
            "Quality Tech",
            "Pune",
            "Testing",
            350000,
            600000,
            "Manual testing and automation testing",
            "#"
        ],

        [
            "UI/UX Designer",
            "Creative Studio",
            "Mumbai",
            "Design",
            350000,
            650000,
            "Figma, UI design and user experience",
            "#"
        ],

        [
            "Java Developer",
            "Software World",
            "Delhi",
            "IT",
            450000,
            800000,
            "Java, OOP, Spring and SQL",
            "#"
        ]

    ];


    // ===============================
    // CHECK WHETHER JOBS ALREADY EXIST
    // ===============================

    db.get(
        "SELECT COUNT(*) AS count FROM jobs",
        (err, result) => {

            if (err) {

                console.error(
                    "Job count error:",
                    err.message
                );

                return;
            }


            // Only add jobs if database is empty

            if (result.count === 0) {

                sampleJobs.forEach(job => {

                    db.run(
                        `
                        INSERT INTO jobs
                        (
                            title,
                            company,
                            location,
                            industry,
                            salary_min,
                            salary_max,
                            description,
                            apply_url
                        )

                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `,
                        job,
                        (err) => {

                            if (err) {

                                console.error(
                                    "Job insert error:",
                                    err.message
                                );

                            }

                        }
                    );

                });


                console.log(
                    "Sample jobs added"
                );

            } else {

                console.log(
                    `${result.count} jobs already exist`
                );

            }

        }
    );

});
// ===============================
// GET JOBS WITH FILTERS
// ===============================

app.get(
    "/api/jobs",
    authenticate,
    (req, res) => {

        const {

            location,

            industry,

            minSalary,

            maxSalary

        } = req.query;


        let sql = `
            SELECT *
            FROM jobs
            WHERE 1 = 1
        `;


        const params = [];


        // Location filter

        if (location) {

            sql += `
                AND location LIKE ?
            `;

            params.push(
                `%${location}%`
            );

        }


        // Industry filter

        if (industry) {

            sql += `
                AND industry LIKE ?
            `;

            params.push(
                `%${industry}%`
            );

        }


        // Minimum salary

        if (minSalary) {

            sql += `
                AND salary_max >= ?
            `;

            params.push(
                Number(minSalary)
            );

        }


        // Maximum salary

        if (maxSalary) {

            sql += `
                AND salary_min <= ?
            `;

            params.push(
                Number(maxSalary)
            );

        }


        sql += `
            ORDER BY created_at DESC
        `;


        db.all(
            sql,
            params,
            (err, jobs) => {

                if (err) {

                    console.error(err);

                    return res
                        .status(500)
                        .json({

                            message:
                                "Could not fetch jobs"

                        });

                }


                res.json(jobs);

            }
        );

    }
);

if (require.main === module) {
    app.listen(
        PORT,
        () => {

            console.log(
                `Server running at http://localhost:${PORT}`
            );

        }
    );
}

module.exports = app;