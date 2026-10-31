let currentReferralLink = "";

function showReferralToast(message) {
    const toast = document.getElementById("referralToast");
    document.getElementById("referralToastText").textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2800);
}

async function copyReferralValue(elementId) {
    const value = document.getElementById(elementId).textContent.trim();
    try {
        await navigator.clipboard.writeText(value);
        showReferralToast("Copied to clipboard.");
    } catch (error) {
        console.error("Referral copy error:", error);
        showReferralToast("Could not copy. Please select and copy the text.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    document.querySelectorAll("[data-copy]").forEach(button => {
        button.addEventListener("click", () => copyReferralValue(button.dataset.copy));
    });

    try {
        const response = await fetch("/api/referrals", { credentials: "include" });
        const data = await response.json();
        if (response.status === 401) {
            window.location.href = "login.html";
            return;
        }
        if (!response.ok) {
            throw new Error(data.message || "Unable to load referrals.");
        }

        currentReferralLink = new URL(
            `register.html?ref=${encodeURIComponent(data.referralCode)}`,
            window.location.href
        ).toString();
        document.getElementById("referralCodeValue").textContent = data.referralCode;
        document.getElementById("referralLinkValue").textContent = currentReferralLink;
        document.getElementById("referralCount").textContent = String(data.referralCount);
        document.getElementById("referralEarned").textContent =
            new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })
                .format(Number(data.totalEarned));

        const leaderboard = document.getElementById("referralLeaderboard");
        leaderboard.replaceChildren();
        if (data.leaderboard.length === 0) {
            const empty = document.createElement("li");
            empty.className = "leaderboard-empty";
            empty.textContent = "Be the first to invite a friend.";
            leaderboard.appendChild(empty);
        } else {
            data.leaderboard.forEach((entry, index) => {
                const item = document.createElement("li");
                const rank = document.createElement("span");
                rank.className = "leaderboard-rank";
                rank.textContent = String(index + 1);
                const identity = document.createElement("span");
                identity.className = "leaderboard-identity";
                const username = document.createElement("strong");
                username.textContent = entry.username;
                const code = document.createElement("small");
                code.textContent = entry.referralCode;
                identity.append(username, code);
                const count = document.createElement("strong");
                count.className = "leaderboard-count";
                count.textContent = `${entry.referrals} ${entry.referrals === 1 ? "referral" : "referrals"}`;
                item.append(rank, identity, count);
                leaderboard.appendChild(item);
            });
        }
    } catch (error) {
        console.error("Referral load error:", error);
        document.getElementById("referralLeaderboard").innerHTML =
            '<li class="leaderboard-empty">Unable to load referrals. Please refresh.</li>';
        showReferralToast(error.message || "Unable to load referrals.");
    }

    document.getElementById("shareReferral").addEventListener("click", async event => {
        const button = event.currentTarget;
        if (!currentReferralLink) return;
        button.disabled = true;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Join me on Nexora",
                    text: "Sign up using my referral link.",
                    url: currentReferralLink
                });
            } else {
                await navigator.clipboard.writeText(currentReferralLink);
                showReferralToast("Referral link copied. Share it with your friends.");
            }
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Referral share error:", error);
                showReferralToast("Unable to share the referral link.");
            }
        } finally {
            button.disabled = false;
        }
    });
});
