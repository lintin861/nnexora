function showSecurityMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
    element.hidden = false;
}

async function submitSecurityForm(form, endpoint, payload, messageElement, successCallback) {
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    messageElement.hidden = true;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!response.ok) {
            throw new Error(data.message || "Unable to update your account.");
        }

        showSecurityMessage(messageElement, data.message);
        if (successCallback) successCallback(data);
    } catch (error) {
        showSecurityMessage(messageElement, error.message || "Unable to update your account.", true);
    } finally {
        submitButton.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const passwordForm = document.getElementById("passwordForm");
    const emailForm = document.getElementById("emailForm");
    const passwordMessage = document.getElementById("passwordMessage");
    const emailMessage = document.getElementById("emailMessage");

    try {
        const response = await fetch("/api/security", { credentials: "include" });
        const data = await response.json();
        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!response.ok) {
            throw new Error(data.message || "Unable to load security settings.");
        }
        document.getElementById("resetEmail").value = data.email;
        document.getElementById("newEmail").value = data.email;
    } catch (error) {
        console.error("Security settings load error:", error);
        showSecurityMessage(passwordMessage, error.message || "Unable to load security settings.", true);
    }

    passwordForm.addEventListener("submit", event => {
        event.preventDefault();
        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (newPassword !== confirmPassword) {
            showSecurityMessage(passwordMessage, "The new passwords do not match.", true);
            return;
        }

        submitSecurityForm(
            passwordForm,
            "/api/security/password",
            {
                currentPassword: document.getElementById("currentPassword").value,
                newPassword
            },
            passwordMessage,
            () => {
                passwordForm.reset();
            }
        );
    });

    emailForm.addEventListener("submit", event => {
        event.preventDefault();
        submitSecurityForm(
            emailForm,
            "/api/security/email",
            {
                email: document.getElementById("newEmail").value,
                currentPassword: document.getElementById("emailCurrentPassword").value
            },
            emailMessage,
            data => {
                document.getElementById("resetEmail").value = data.email;
                document.getElementById("newEmail").value = data.email;
                document.getElementById("emailCurrentPassword").value = "";
            }
        );
    });

    document.getElementById("resetPasswordButton").addEventListener("click", () => {
        showSecurityMessage(
            document.getElementById("resetMessage"),
            "Email delivery is not configured yet. Change your password using the form above.",
            true
        );
    });
});
