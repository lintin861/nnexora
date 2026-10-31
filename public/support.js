// Add the client's Telegram support and channel URLs here when available.
const TELEGRAM_SUPPORT_URL = "";
const TELEGRAM_CHANNEL_URL = "";

function setTelegramLink(element, url) {
    if (!url) return;

    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== "https:" || !["t.me", "telegram.me"].includes(parsedUrl.hostname)) {
            console.error("Telegram links must use https://t.me or https://telegram.me.");
            return;
        }

        element.href = parsedUrl.toString();
        element.target = "_blank";
        element.rel = "noopener noreferrer";
        element.hidden = false;
    } catch (error) {
        console.error("Invalid Telegram URL:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const channelLink = document.getElementById("telegramChannelLink");
    channelLink.addEventListener("click", event => {
        if (channelLink.getAttribute("aria-disabled") === "true") {
            event.preventDefault();
        }
    });

    setTelegramLink(
        document.getElementById("telegramSupportLink"),
        TELEGRAM_SUPPORT_URL
    );
    if (TELEGRAM_CHANNEL_URL) {
        setTelegramLink(channelLink, TELEGRAM_CHANNEL_URL);
        if (!channelLink.hidden) {
            channelLink.classList.remove("support-shortcut-disabled");
            channelLink.removeAttribute("aria-disabled");
            document.getElementById("telegramChannelLabel").textContent = "Telegram Channel";
        }
    }
});
