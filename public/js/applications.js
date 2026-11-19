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
// LOAD APPLICATIONS
// ===============================

async function loadApplications() {

    try {

        const response =
            await fetch(
                "/api/applications",
                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }
            );


        const applications =
            await response.json();


        if (!response.ok) {

            throw new Error(
                applications.message
            );

        }


        displayApplications(
            applications
        );


    } catch (error) {

        console.error(error);


        document.getElementById(
            "applications"
        ).innerHTML = `

            <div class="job-card">

                <h3>
                    Unable to load applications
                </h3>

                <p>
                    ${error.message}
                </p>

            </div>

        `;

    }

}


// ===============================
// DISPLAY APPLICATIONS
// ===============================

function displayApplications(
    applications
) {

    const container =
        document.getElementById(
            "applications"
        );


    // Summary

    document.getElementById(
        "totalCount"
    ).textContent =
        applications.length;


    document.getElementById(
        "appliedCount"
    ).textContent =
        applications.filter(
            app =>
                app.status === "Applied"
        ).length;


    document.getElementById(
        "interviewCount"
    ).textContent =
        applications.filter(
            app =>
                app.status === "Interview"
        ).length;


    document.getElementById(
        "selectedCount"
    ).textContent =
        applications.filter(
            app =>
                app.status === "Selected"
        ).length;


    if (applications.length === 0) {

        container.innerHTML = `

            <div class="job-card">

                <h3>
                    No applications yet
                </h3>

                <p>
                    Apply for a job from the
                    dashboard to see it here.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        applications.map(
            app => `

            <div class="application-card">

                <div class="application-info">

                    <h3>
                        ${escapeHTML(
                            app.title
                        )}
                    </h3>


                    <p class="company">

                        ${escapeHTML(
                            app.company
                        )}

                    </p>


                    <div class="job-tags">

                        <span>
                            📍
                            ${escapeHTML(
                                app.location
                            )}
                        </span>


                        <span>
                            ${escapeHTML(
                                app.industry
                            )}
                        </span>

                    </div>


                    <small>

                        Applied:
                        ${new Date(
                            app.applied_at
                        ).toLocaleDateString()}

                    </small>

                </div>


                <div class="application-status">

                    <label>
                        Status
                    </label>


                    <select
                        onchange="
                            updateStatus(
                                ${app.id},
                                this.value
                            )
                        "
                    >

                        <option
                            value="Applied"
                            ${
                                app.status ===
                                "Applied"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Applied
                        </option>


                        <option
                            value="Reviewing"
                            ${
                                app.status ===
                                "Reviewing"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Reviewing
                        </option>


                        <option
                            value="Interview"
                            ${
                                app.status ===
                                "Interview"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Interview
                        </option>


                        <option
                            value="Selected"
                            ${
                                app.status ===
                                "Selected"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Selected
                        </option>


                        <option
                            value="Rejected"
                            ${
                                app.status ===
                                "Rejected"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Rejected
                        </option>

                    </select>

                </div>

            </div>

        `
        ).join("");

}


// ===============================
// UPDATE STATUS
// ===============================

async function updateStatus(
    applicationId,
    status
) {

    try {

        const response =
            await fetch(
                `/api/applications/${applicationId}`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`

                    },

                    body: JSON.stringify({

                        status

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            alert(data.message);

            return;

        }


        loadApplications();


    } catch (error) {

        alert(
            "Could not update application."
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
// START
// ===============================

loadApplications();