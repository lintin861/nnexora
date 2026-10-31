document.addEventListener("DOMContentLoaded", async () => {

    const surpriseBonus = document.getElementById("surpriseBonus");
    const claimButton = document.getElementById("claimSurpriseBtn");
    const closeButton = document.getElementById("closeSurpriseBonus");

    if (!surpriseBonus || !claimButton) {
        return;
    }

    let nextBonusTimer = null;
    let isWaitingForWelcome = Boolean(window.nexoraWelcomeBonusPending);

    const showBonus = () => {
        if (isWaitingForWelcome) return;
        surpriseBonus.hidden = false;
    };

    document.addEventListener("welcomeBonusClosed", () => {
        isWaitingForWelcome = false;
        if (surpriseBonus.dataset.available === "true") showBonus();
    });

    await new Promise(resolve => {
        document.addEventListener("welcomeBonusReady", resolve, { once: true });
    });

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            surpriseBonus.hidden = true;
        });
    }

    async function refreshBonusAvailability() {
        try {
            const response = await fetch("/api/surprise-bonus", {
                credentials: "include"
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load surprise bonus.");
            }

            if (data.available) {
                surpriseBonus.dataset.available = "true";
                surpriseBonus.dataset.nextAvailableAt = "";
                if (!isWaitingForWelcome) showBonus();
                return;
            }

            surpriseBonus.dataset.available = "false";
            surpriseBonus.hidden = true;
            surpriseBonus.dataset.nextAvailableAt = data.nextAvailableAt || "";
            clearTimeout(nextBonusTimer);
            const delay = Math.max(0, Number(data.remaining) || 0);
            nextBonusTimer = setTimeout(refreshBonusAvailability, delay + 100);
        } catch (error) {
            console.error("Surprise bonus error:", error);
            surpriseBonus.hidden = true;
        }
    }

    await refreshBonusAvailability();

    claimButton.addEventListener("click", async () => {

        claimButton.disabled = true;

        const originalText = claimButton.textContent;
        claimButton.textContent = "Claiming...";

        try {

            const response = await fetch(
                "/api/surprise-bonus/claim",
                {
                    method: "POST",
                    credentials: "include"
                }
            );


            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to claim bonus.");
            }

            const balance = document.getElementById("balance");
            if (balance) {
                balance.textContent = new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                    minimumFractionDigits: 2
                }).format(Number(data.balance));
            }

            surpriseBonus.hidden = true;
            surpriseBonus.dataset.available = "false";
            await refreshBonusAvailability();
        } catch (error) {
            console.error("Surprise bonus claim error:", error);
            window.alert(error.message || "Unable to claim bonus.");
        } finally {
            claimButton.disabled = false;
            claimButton.textContent = originalText;
        }

    });

});