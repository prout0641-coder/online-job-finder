// ===============================
// CHECK LOGIN
// ===============================

const token =
    localStorage.getItem("token");


if (!token) {

    window.location.href =
        "login.html";

}


// ===============================
// SHOW USER NAME
// ===============================

const userName =
    localStorage.getItem("userName");


document.getElementById(
    "userName"
).textContent =
    userName || "User";


// ===============================
// LOAD JOBS
// ===============================

async function loadJobs() {

    const location =
        document.getElementById(
            "location"
        ).value;


    const industry =
        document.getElementById(
            "industry"
        ).value;


    const minSalary =
        document.getElementById(
            "minSalary"
        ).value;


    const maxSalary =
        document.getElementById(
            "maxSalary"
        ).value;


    const params =
        new URLSearchParams();


    if (location) {

        params.append(
            "location",
            location
        );

    }


    if (industry) {

        params.append(
            "industry",
            industry
        );

    }


    if (minSalary) {

        params.append(
            "minSalary",
            minSalary
        );

    }


    if (maxSalary) {

        params.append(
            "maxSalary",
            maxSalary
        );

    }


    try {

        const response =
            await fetch(
                `/api/jobs?${params}`,
                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }
            );


        const jobs =
            await response.json();


        displayJobs(jobs);


    } catch (error) {

        console.error(error);

        document.getElementById(
            "jobs"
        ).innerHTML = `

            <div class="job-card">

                <h3>
                    Unable to load jobs
                </h3>

                <p>
                    Please check the server.
                </p>

            </div>

        `;

    }

}


// ===============================
// DISPLAY JOBS
// ===============================

function displayJobs(jobs) {

    const container =
        document.getElementById(
            "jobs"
        );


    const count =
        document.getElementById(
            "jobCount"
        );


    count.textContent =
        `${jobs.length} jobs`;


    if (jobs.length === 0) {

        container.innerHTML = `

            <div class="job-card">

                <h3>
                    No jobs found
                </h3>

                <p>
                    Try changing your filters.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        jobs.map(job => `

        <div class="job-card">

            <h3>
                ${escapeHTML(job.title)}
            </h3>


            <div class="company">

                ${escapeHTML(job.company)}

            </div>


            <div class="job-tags">

                <span>
                    📍 ${escapeHTML(job.location)}
                </span>


                <span>
                    ${escapeHTML(job.industry)}
                </span>


                <span>
                    ₹${Number(
                        job.salary_min
                    ).toLocaleString()}
                    -
                    ₹${Number(
                        job.salary_max
                    ).toLocaleString()}
                </span>

            </div>


            <p class="job-description">

                ${escapeHTML(
                    job.description || ""
                )}

            </p>


          <button
              class="apply-btn"
              onclick="applyJob(${job.id})"
           >
    Apply Now
</button>

        </div>

    `).join("");

}


// ===============================
// APPLY JOB
// ===============================

async function applyJob(jobId) {

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    if (!jobId) {
        alert("Invalid job.");
        return;
    }

    try {

        const response = await fetch("/api/applications", {

            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify({
                jobId: Number(jobId)
            })

        });

        const data = await response.json();

        if (response.ok) {

            alert("✅ " + data.message);

            // Reload jobs so the button can change
            loadJobs();

        } else if (response.status === 409) {

            alert("⚠️ You have already applied for this job.");

        } else if (response.status === 401) {

            alert("⚠️ Your session has expired. Please login again.");

            localStorage.removeItem("token");
            localStorage.removeItem("userName");

            window.location.href = "login.html";

        } else {

            alert(
                "❌ " +
                (data.message || "Could not apply for this job.")
            );

        }

    } catch (error) {

        console.error("Apply error:", error);

        alert(
            "❌ Unable to apply for this job. Please check your server."
        );

    }
}

// ===============================
// LOGOUT
// ===============================

function logout() {

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "userName"
    );


    window.location.href =
        "login.html";

}


// ===============================
// SECURITY
// ===============================

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ===============================
// LOAD JOBS WHEN PAGE OPENS
// ===============================

loadJobs();
// ==========================================
// GEMINI AI JOB RECOMMENDATIONS
// ==========================================

const askGeminiBtn =
    document.getElementById("askGeminiBtn");

const geminiBox =
    document.getElementById("geminiBox");

const generateRecommendationsBtn =
    document.getElementById(
        "generateRecommendationsBtn"
    );

const geminiApiKey =
    document.getElementById(
        "geminiApiKey"
    );

const geminiLoading =
    document.getElementById(
        "geminiLoading"
    );

const geminiResult =
    document.getElementById(
        "geminiResult"
    );


// ==========================================
// SHOW GEMINI BOX
// ==========================================

if (askGeminiBtn) {

    askGeminiBtn.addEventListener(
        "click",
        function() {

            geminiBox.style.display = "block";

            geminiApiKey.focus();

        }
    );

}


// ==========================================
// GENERATE RECOMMENDATIONS
// ==========================================

if (generateRecommendationsBtn) {

    generateRecommendationsBtn.addEventListener(
        "click",
        async function() {

            const token =
                localStorage.getItem("token");


            const apiKey =
                geminiApiKey.value.trim();


            // -------------------------------
            // CHECK LOGIN
            // -------------------------------

            if (!token) {

                window.location.href =
                    "login.html";

                return;

            }


            // -------------------------------
            // CHECK API KEY
            // -------------------------------

            if (!apiKey) {

                geminiResult.innerHTML = `

                    <p>
                        ⚠️ Please enter your Gemini API key.
                    </p>

                `;

                return;

            }


            // -------------------------------
            // SHOW LOADING
            // -------------------------------

            geminiLoading.style.display =
                "block";

            geminiResult.innerHTML = "";

            generateRecommendationsBtn.disabled =
                true;


            try {

                const response =
                    await fetch(
                        "/api/ai/recommend",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`

                            },

                            body: JSON.stringify({

                                apiKey:
                                    apiKey

                            })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(

                        data.message ||
                        "Gemini request failed"

                    );

                }


             // -------------------------------
// DISPLAY RESULT
// -------------------------------

geminiResult.innerHTML = `
    <div class="gemini-results">

        <div class="gemini-results-header">
            <h3>✨ Recommended Jobs For You</h3>

            <span class="ai-badge">
                AI Powered
            </span>
        </div>

        <div class="ai-job-cards">
    ${renderAIJobCards(data.recommendations || [])}
</div>

    </div>
`;   

            }

            catch (error) {

                console.error(error);

                geminiResult.innerHTML = `

                    <div class="gemini-error">

                        ❌ ${error.message}

                    </div>

                `;

            }

            finally {

                geminiLoading.style.display =
                    "none";

                generateRecommendationsBtn.disabled =
                    false;

            }

        }
    );

}


// ==========================================
// FORMAT GEMINI TEXT
// ==========================================

function formatGeminiText(text) {

    if (!text) {
        return "No recommendations received.";
    }

    return String(text)
        .replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        )
        .replace(
            /\n/g,
            "<br>"
        );
}
function renderAIJobCards(recommendations) {

    if (!recommendations.length) {
        return `
            <div class="gemini-response">
                No matching jobs found.
            </div>
        `;
    }

    return recommendations.map(job => {

        return `
            <div class="ai-job-card">

                <div class="ai-job-header">

                    <div>
                        <div class="ai-job-title">
                            Job Match #${job.jobId}
                        </div>

                        <div class="ai-company">
                            AI Recommended Job
                        </div>
                    </div>

                    <div class="match-score">
                        ${job.matchPercentage}% Match
                    </div>

                </div>

                <div class="ai-match-reason">
                    <strong>Why this job matches:</strong>
                    <p>${escapeHTML(job.whyMatch || "Good match based on your profile.")}</p>
                </div>

                <div class="ai-job-details">

                    <div>
                        <strong>Matching Skills</strong>
                        <p>
                            ${(job.matchingSkills || [])
                                .map(skill => escapeHTML(skill))
                                .join(", ") || "Not specified"}
                        </p>
                    </div>

                    <div>
                        <strong>Skills to Improve</strong>
                        <p>
                            ${(job.skillsToImprove || [])
                                .map(skill => escapeHTML(skill))
                                .join(", ") || "None"}
                        </p>
                    </div>

                </div>

            </div>
        `;

    }).join("");
}