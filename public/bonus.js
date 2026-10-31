async function loadWelcomeBonus() {

    const overlay = document.getElementById("welcomeBonus");

    if (!overlay) return;
    const shouldShowWelcome = sessionStorage.getItem("showWelcomeBonus") === "1";
    if (shouldShowWelcome) {
        sessionStorage.removeItem("showWelcomeBonus");
        window.nexoraWelcomeBonusPending = true;
    }

    try {

        const response = await fetch("/api/bonuses", {
            credentials: "include"
        });

        if (!response.ok) {
            overlay.hidden = true;
            finishWelcomePopup();
            return;
        }

        const data = await response.json();

        const bonus = data.welcome;

        if (!bonus || (!shouldShowWelcome && !data.welcomeBonusGrantedNow)) {
            overlay.hidden = true;
            finishWelcomePopup();
            return;
        }

        document.getElementById("welcomeBonusAmount").textContent =
            `₦${Number(bonus.amount).toLocaleString("en-NG")}`;
        if (data.welcomeBonusGrantedNow) {
            const balance = document.getElementById("balance");
            if (balance) {
                balance.textContent = new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    minimumFractionDigits: 2
                }).format(Number(data.balance));
            }
        }
        overlay.hidden = false;
        window.nexoraWelcomeBonusPending = true;

    } catch (error) {

        console.error(
            "Could not load bonus:",
            error
        );
        overlay.hidden = true;
        finishWelcomePopup();
    }
}

function closeWelcomeBonus() {
    const overlay = document.getElementById("welcomeBonus");
    if (overlay) overlay.hidden = true;
    finishWelcomePopup();
}

function finishWelcomePopup() {
    window.nexoraWelcomeBonusPending = false;
    document.dispatchEvent(new Event("welcomeBonusClosed"));
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const closeButton = document.getElementById("welcomeBonusClose");
        if (closeButton) closeButton.addEventListener("click", closeWelcomeBonus);
        const doneButton = document.getElementById("welcomeBonusDone");
        if (doneButton) doneButton.addEventListener("click", closeWelcomeBonus);
        const overlay = document.getElementById("welcomeBonus");
        if (overlay) {
            overlay.addEventListener("click", event => {
                if (event.target === overlay) closeWelcomeBonus();
            });
        }
        loadWelcomeBonus().finally(() => {
            document.dispatchEvent(new Event("welcomeBonusReady"));
        });
    }
);