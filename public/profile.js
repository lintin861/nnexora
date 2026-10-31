function goTo(page) {

    window.location.href = page;

}


/* ---------------------------------
   PROFILE OPTION
--------------------------------- */

function openOption(option) {

    showToast(
        option + " will be built next."
    );

}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/api/me", { credentials: "include" });
        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!response.ok) {
            throw new Error(data.message || "Unable to load your profile.");
        }

        const username = document.getElementById("profileUsername");
        const email = document.getElementById("profileEmail");
        const initial = document.getElementById("profileAvatarInitial");
        const balance = document.getElementById("profileBalance");
        username.textContent = data.username;
        email.textContent = data.email;
        initial.textContent = data.username.charAt(0).toUpperCase();
        balance.textContent = new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 2
        }).format(Number(data.balance));
    } catch (error) {
        console.error("Profile load error:", error);
        showToast(error.message || "Unable to load your profile.");
    }
});


/* ---------------------------------
   CHANGE PHOTO
--------------------------------- */

function changePhoto() {

    showToast(
        "Profile photo settings will be added later."
    );

}


/* ---------------------------------
   LOGOUT
--------------------------------- */

function logout() {

    const confirmed = confirm(
        "Are you sure you want to log out?"
    );


    if (confirmed) {

        window.location.href =
            "login.html";

    }

}


/* ---------------------------------
   TOAST
--------------------------------- */

function showToast(message) {

    const toast =
        document.getElementById("profileToast");

    const text =
        document.getElementById("profileToastText");


    text.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}