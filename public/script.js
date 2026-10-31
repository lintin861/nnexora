/* =========================================
   NEXORA HOME PAGE
========================================= */


/* -----------------------------------------
   DEMO DATA
----------------------------------------- */

let balanceVisible = true;

const account = {
    username: "kikj6ht",
    balance: 60000
};


/* -----------------------------------------
   TOAST
----------------------------------------- */

function showToast(message) {

    const toast = document.getElementById("toast");
    const toastText = document.getElementById("toastText");

    toastText.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* -----------------------------------------
   BALANCE
----------------------------------------- */

function toggleBalance() {

    const balance = document.getElementById("balance");
    const eyeIcon = document.getElementById("eyeIcon");

    balanceVisible = !balanceVisible;

    if (balanceVisible) {

        balance.textContent = "₦60,000.00";

        eyeIcon.className = "fa-regular fa-eye";

    } else {

        balance.textContent = "₦••••••";

        eyeIcon.className = "fa-regular fa-eye-slash";
    }
}


/* -----------------------------------------
   BUY KEY
----------------------------------------- */

function buyKey() {

    openKeyModal();
}


/* -----------------------------------------
   WITHDRAW
----------------------------------------- */

function withdraw() {

    showToast("Withdrawal page coming next.");
}


/* -----------------------------------------
   UPGRADE
----------------------------------------- */

function upgrade() {

    showToast("Upgrade page coming next.");
}


/* -----------------------------------------
   EARN
----------------------------------------- */

function earn() {

    showToast("Tap & Earn page coming next.");
}


/* -----------------------------------------
   SUPPORT
----------------------------------------- */

function support() {

    window.location.href = "support.html";

}


/* -----------------------------------------
   NOTIFICATION
----------------------------------------- */

function showNotification() {

    showToast("You have no new notifications.");
}


/* -----------------------------------------
   PROFILE
----------------------------------------- */

function openProfile() {

    showToast("Profile page coming next.");
}


/* -----------------------------------------
   EARNINGS PERIOD
----------------------------------------- */

function changePeriod() {

    showToast("Earnings period changed.");
}


/* -----------------------------------------
   TRANSACTIONS
----------------------------------------- */

function viewAll() {

    showToast("Transaction history coming next.");
}


/* -----------------------------------------
   CHANNEL
----------------------------------------- */

function joinChannel() {

    showToast("Channel link will be connected later.");
}


/* -----------------------------------------
   CLOSE POPUP
----------------------------------------- */

function closePopup() {

    const popup = document.getElementById("channelPopup");

    popup.style.display = "none";
}


/* -----------------------------------------
   CLOSE ACTIVATION BANNER
----------------------------------------- */

function closeBanner() {

    const banner = document.querySelector(".activation-banner");

    banner.style.display = "none";
}


/* -----------------------------------------
   NAVIGATION
----------------------------------------- */


 function navigate(page) {

    const pages = {
        home: "index.html",
        activity: "activity.html",
        earn: "earn.html",
        card: "card.html",
        profile: "profile.html"
    };

    if (pages[page]) {
        window.location.href = pages[page];
    }
}


/* -----------------------------------------
   STARTUP
----------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

    initializeKeyPurchase();
    console.log("Nexora Home loaded.");

});

/* -----------------------------------------
   NEXORA KEY PURCHASE
----------------------------------------- */

let keyPurchaseId = "";
let keyPaymentExpiresAt = 0;
let keyCountdownInterval;

function initializeKeyPurchase() {
    const modal = document.getElementById("keyModal");
    if (!modal) return;

    document.getElementById("keyContinue").addEventListener("click", () => {
        setKeyStep(2);
    });
    document.getElementById("keyModalBack").addEventListener("click", () => {
        if (document.querySelector('[data-key-step="3"]:not([hidden])')) {
            setKeyStep(2);
        } else {
            setKeyStep(1);
        }
    });
    document.getElementById("keyModalClose").addEventListener("click", closeKeyModal);
    document.getElementById("keyDone").addEventListener("click", closeKeyModal);
    document.getElementById("keyProceed").addEventListener("click", beginKeyPayment);
    document.getElementById("keySubmit").addEventListener("click", submitKeyReceipt);
    document.getElementById("keyReceipt").addEventListener("change", handleKeyReceiptSelection);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeKeyModal();
    });
    modal.querySelectorAll("[data-copy]").forEach((button) => {
        button.addEventListener("click", () => copyKeyPaymentValue(button.dataset.copy));
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !modal.hidden) closeKeyModal();
    });
}

function openKeyModal() {
    const modal = document.getElementById("keyModal");
    modal.hidden = false;
    document.body.classList.add("key-modal-open");
    setKeyStep(1);
    document.getElementById("keyStepError").hidden = true;
    document.getElementById("keyPaymentError").hidden = true;
}

function closeKeyModal() {
    const modal = document.getElementById("keyModal");
    modal.hidden = true;
    document.body.classList.remove("key-modal-open");
    clearInterval(keyCountdownInterval);
    keyPurchaseId = "";
    keyPaymentExpiresAt = 0;
    document.getElementById("keyReceipt").value = "";
    document.getElementById("keyUploadText").textContent = "Tap to upload receipt";
    document.getElementById("keySubmit").disabled = true;
    setKeyStep(1);
}

function setKeyStep(step) {
    document.querySelectorAll("[data-key-step]").forEach((panel) => {
        panel.hidden = panel.dataset.keyStep !== String(step);
    });
    document.querySelectorAll(".key-progress span").forEach((indicator, index) => {
        indicator.classList.toggle("active", index < Math.min(step, 3));
    });
    document.getElementById("keyModalBack").hidden = step === 1 || step === 4;
    document.getElementById("keyStepError").hidden = true;
    document.getElementById("keyPaymentError").hidden = true;
}

async function beginKeyPayment() {
    const button = document.getElementById("keyProceed");
    const error = document.getElementById("keyStepError");
    button.disabled = true;
    button.textContent = "Preparing payment…";
    error.hidden = true;

    try {
        const response = await fetch("/api/key-purchases", { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not prepare payment.");

        keyPurchaseId = result.purchaseId;
        keyPaymentExpiresAt = Date.parse(result.expiresAt);
        document.getElementById("keyPrice").textContent = formatNaira(result.amount);
        document.getElementById("keyTransferAmount").textContent = formatNaira(result.amount);
        document.getElementById("keyBankName").textContent = result.paymentDetails.bankName;
        document.getElementById("keyAccountNumber").textContent = result.paymentDetails.accountNumber;
        document.getElementById("keyAccountName").textContent = result.paymentDetails.accountName;
        document.getElementById("keyReceipt").value = "";
        document.getElementById("keyUploadText").textContent = "Tap to upload receipt";
        document.getElementById("keySubmit").disabled = true;
        setKeyStep(3);
        startKeyCountdown();
    } catch (requestError) {
        error.textContent = requestError.message;
        error.hidden = false;
    } finally {
        button.disabled = false;
        button.textContent = "Proceed to Payment";
    }
}

function formatNaira(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(amount);
}

function startKeyCountdown() {
    clearInterval(keyCountdownInterval);
    const update = () => {
        const secondsRemaining = Math.max(0, Math.ceil((keyPaymentExpiresAt - Date.now()) / 1000));
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        document.getElementById("keyCountdown").textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
        if (secondsRemaining === 0) {
            clearInterval(keyCountdownInterval);
            document.getElementById("keySubmit").disabled = true;
            showKeyPaymentError("This payment session expired. Close this window and start again.");
        }
    };
    update();
    keyCountdownInterval = setInterval(update, 1000);
}

function handleKeyReceiptSelection(event) {
    const file = event.target.files[0];
    const submit = document.getElementById("keySubmit");
    if (!file) {
        submit.disabled = true;
        document.getElementById("keyUploadText").textContent = "Tap to upload receipt";
        return;
    }
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
        event.target.value = "";
        submit.disabled = true;
        document.getElementById("keyUploadText").textContent = "Tap to upload receipt";
        showKeyPaymentError("Choose a JPG, PNG or WEBP image smaller than 5 MB.");
        return;
    }
    document.getElementById("keyUploadText").textContent = file.name;
    document.getElementById("keyPaymentError").hidden = true;
    submit.disabled = !keyPurchaseId || Date.now() >= keyPaymentExpiresAt;
}

async function submitKeyReceipt() {
    const fileInput = document.getElementById("keyReceipt");
    const button = document.getElementById("keySubmit");
    if (!keyPurchaseId || !fileInput.files.length || Date.now() >= keyPaymentExpiresAt) {
        showKeyPaymentError("Choose a valid receipt before the payment session expires.");
        return;
    }

    button.disabled = true;
    button.textContent = "Submitting…";
    document.getElementById("keyPaymentError").hidden = true;
    const formData = new FormData();
    formData.append("receipt", fileInput.files[0]);

    try {
        const response = await fetch(`/api/key-purchases/${encodeURIComponent(keyPurchaseId)}/receipt`, {
            method: "POST",
            body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not submit the receipt.");
        clearInterval(keyCountdownInterval);
        document.getElementById("keyPaymentReference").textContent = result.reference;
        setKeyStep(4);
    } catch (requestError) {
        showKeyPaymentError(requestError.message);
        button.disabled = false;
    } finally {
        button.textContent = "Submit Payment";
    }
}

function showKeyPaymentError(message) {
    const error = document.getElementById("keyPaymentError");
    error.textContent = message;
    error.hidden = false;
}

async function copyKeyPaymentValue(elementId) {
    const value = document.getElementById(elementId).textContent.trim();
    try {
        await navigator.clipboard.writeText(value);
        showToast("Copied to clipboard.");
    } catch (error) {
        showToast("Could not copy. Please select and copy the value.");
    }
}