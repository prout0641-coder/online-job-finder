const token =
    localStorage.getItem("token");


if (!token) {

    window.location.href =
        "login.html";

}


// ===============================
// LOAD PROFILE
// ===============================

async function loadProfile() {

    try {

        const response =
            await fetch(
                "/api/profile",
                {

                    headers: {

                        Authorization:
                            `Bearer ${token}`

                    }

                }
            );


        const profile =
            await response.json();


        document.getElementById(
            "full_name"
        ).value =
            profile.full_name || "";


        document.getElementById(
            "phone"
        ).value =
            profile.phone || "";


        document.getElementById(
            "location"
        ).value =
            profile.location || "";


        document.getElementById(
            "skills"
        ).value =
            profile.skills || "";


        document.getElementById(
            "industry"
        ).value =
            profile.industry || "";


        document.getElementById(
            "min_salary"
        ).value =
            profile.min_salary || "";


        document.getElementById(
            "max_salary"
        ).value =
            profile.max_salary || "";


        document.getElementById(
            "about"
        ).value =
            profile.about || "";


    } catch (error) {

        console.error(error);

    }

}


// ===============================
// SAVE PROFILE
// ===============================

document.getElementById(
    "profileForm"
).addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const profile = {

            full_name:
                document.getElementById(
                    "full_name"
                ).value,

            phone:
                document.getElementById(
                    "phone"
                ).value,

            location:
                document.getElementById(
                    "location"
                ).value,

            skills:
                document.getElementById(
                    "skills"
                ).value,

            industry:
                document.getElementById(
                    "industry"
                ).value,

            min_salary:
                document.getElementById(
                    "min_salary"
                ).value,

            max_salary:
                document.getElementById(
                    "max_salary"
                ).value,

            about:
                document.getElementById(
                    "about"
                ).value

        };


        try {

            const response =
                await fetch(
                    "/api/profile",
                    {

                        method: "PUT",

                        headers: {

                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`

                        },

                        body:
                            JSON.stringify(profile)

                    }
                );


            const data =
                await response.json();


            const message =
                document.getElementById(
                    "profileMessage"
                );


            if (response.ok) {

                message.textContent =
                    "✅ " +
                    data.message;

            } else {

                message.textContent =
                    "❌ " +
                    data.message;

            }


        } catch (error) {

            console.error(error);

        }

    }
);


// ===============================
// LOGOUT
// ===============================

function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("userName");

    window.location.href =
        "login.html";

}


loadProfile();