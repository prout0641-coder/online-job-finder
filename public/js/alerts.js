const token = localStorage.getItem("token");


// ===============================
// CHECK LOGIN
// ===============================

if (!token) {

    window.location.href = "login.html";

}


// ===============================
// LOAD ALERTS
// ===============================

async function loadAlerts() {

    try {

        const response = await fetch(
            "/api/job-alerts",
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const alerts =
            await response.json();


        const container =
            document.getElementById(
                "alertsList"
            );


        if (!alerts.length) {

            container.innerHTML = `
                <p>
                    You have no job alerts yet.
                </p>
            `;

            return;

        }


        container.innerHTML =
            alerts.map(alert => `

                <div class="alert-item">

                    <h3>
                        🔔 ${alert.name}
                    </h3>

                    <p>
                        📍 ${alert.location || "Any location"}
                    </p>

                    <p>
                        💼 ${alert.industry || "Any industry"}
                    </p>

                    <p>
                        💰 ₹${alert.min_salary || 0}
                        -
                        ₹${alert.max_salary || "Any"}
                    </p>

                    <p>
                        🔎 ${alert.keywords || "Any keywords"}
                    </p>

                    <button
                        onclick="deleteAlert(${alert.id})"
                        class="delete-btn"
                    >
                        Delete
                    </button>

                </div>

            `).join("");

    }

    catch (error) {

        console.error(error);

        document.getElementById(
            "alertsList"
        ).innerHTML =
            "Could not load alerts.";

    }

}


// ===============================
// CREATE ALERT
// ===============================

document
    .getElementById("alertForm")
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const alertData = {

                name:
                    document.getElementById(
                        "alert_name"
                    ).value,

                location:
                    document.getElementById(
                        "alert_location"
                    ).value,

                industry:
                    document.getElementById(
                        "alert_industry"
                    ).value,

                min_salary:
                    document.getElementById(
                        "alert_min_salary"
                    ).value,

                max_salary:
                    document.getElementById(
                        "alert_max_salary"
                    ).value,

                keywords:
                    document.getElementById(
                        "alert_keywords"
                    ).value

            };


            try {

                const response =
                    await fetch(
                        "/api/job-alerts",
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${token}`

                            },

                            body:
                                JSON.stringify(
                                    alertData
                                )

                        }
                    );


                const data =
                    await response.json();


                document.getElementById(
                    "alertMessage"
                ).textContent =
                    data.message;


                if (response.ok) {

                    document
                        .getElementById(
                            "alertForm"
                        )
                        .reset();

                    loadAlerts();

                }

            }

            catch (error) {

                console.error(error);

            }

        }
    );


// ===============================
// DELETE ALERT
// ===============================

async function deleteAlert(id) {

    try {

        const response =
            await fetch(
                `/api/job-alerts/${id}`,
                {

                    method: "DELETE",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json();


        alert(data.message);


        loadAlerts();

    }

    catch (error) {

        console.error(error);

    }

}


// ===============================
// LOGOUT
// ===============================

function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("userName");

    window.location.href =
        "login.html";

}


// LOAD ALERTS
loadAlerts();