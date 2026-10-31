const amountInput =
    document.getElementById("amount");

const bankInput =
    document.getElementById("bank");

const accountInput =
    document.getElementById("accountNumber");

const secretKeyInput =
    document.getElementById("secretKey");


/* ================================
   QUICK AMOUNT
================================ */

function setAmount(amount) {

    amountInput.value = amount;

}


/* ================================
   WITHDRAW
================================ */

async function withdrawFunds() {

    const amount =
        Number(amountInput.value);

    const bank =
        bankInput.value;

    const accountNumber =
        accountInput.value.trim();

    const secretKey =
        secretKeyInput.value.trim();


    if (!amount || amount <= 0) {

        showToast(
            "Enter a withdrawal amount."
        );

        return;
    }


    if (!bank) {

        showToast(
            "Please select your bank."
        );

        return;
    }


    if (!/^\d{10}$/.test(accountNumber)) {

        showToast(
            "Enter a valid 10-digit account number."
        );

        return;
    }


    if (!secretKey) {

        showToast(
            "Enter your Nexora Secret Key."
        );

        return;
    }


    const button = document.querySelector(".withdraw-button");
    button.disabled = true;

    try {
        const response = await fetch("/api/withdraw", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount,
                bank,
                accountNumber
            })
        });
        const data = await response.json();

        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || "Unable to submit withdrawal.");
        }

        document.getElementById("balance").textContent =
            formatNaira(data.balance);
        showToast(data.message);
    } catch (error) {
        showToast(error.message || "Unable to submit withdrawal.");
    } finally {
        button.disabled = false;
    }

}


/* ================================
   BACK
================================ */

function goBack() {

    window.history.back();

}


/* ================================
   NAVIGATION
================================ */

function goTo(page) {

    window.location.href = page;

}


/* ================================
   TOAST
================================ */

function showToast(message) {

    const toast =
        document.getElementById("withdrawToast");

    const text =
        document.getElementById("withdrawToastText");


    text.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}

function formatNaira(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2
    }).format(Number(amount) || 0);
}


/* ================================
   ACCOUNT NUMBER
================================ */

accountInput.addEventListener(
    "input",
    () => {

        accountInput.value =
            accountInput.value
                .replace(/\D/g, "")
                .slice(0, 10);

    }
);

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/api/me", {
            credentials: "include"
        });
        const data = await response.json();
        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!response.ok) {
            throw new Error(data.message || "Unable to load balance.");
        }
        document.getElementById("balance").textContent = formatNaira(data.balance);
    } catch (error) {
        showToast(error.message || "Unable to load balance.");
    }
});