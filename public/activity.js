// ===============================
// ACTIVITY PAGE
// ===============================

const activityList = document.getElementById("activityList");
const emptyState = document.getElementById("emptyState");

let allTransactions = [];


// ===============================
// FORMAT MONEY
// ===============================

function formatMoney(amount) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2
    }).format(Number(amount) || 0);
}


// ===============================
// FORMAT DATE
// ===============================

function formatDate(date) {
    if (!date) return "";

    const d = new Date(date);

    if (isNaN(d.getTime())) return "";

    return d.toLocaleString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}


// ===============================
// GET TRANSACTION TYPE
// ===============================

function getTransactionType(transaction) {

    if (transaction.type === "credit") {
        return "earning";
    }

    if (transaction.type === "debit") {
        return "withdrawal";
    }

    return transaction.type || "other";
}


// ===============================
// TRANSACTION ICON
// ===============================

function getTransactionIcon(transaction) {

    const title = (transaction.title || "").toLowerCase();

    if (title.includes("welcome")) {
        return "🎁";
    }

    if (title.includes("earn") || title.includes("reward")) {
        return "💰";
    }

    if (title.includes("withdraw")) {
        return "💸";
    }

    return transaction.type === "credit" ? "💰" : "📄";
}


// ===============================
// RENDER TRANSACTIONS
// ===============================

function renderTransactions(transactions) {

    if (!activityList) return;

    activityList.innerHTML = "";

    if (!transactions || transactions.length === 0) {

        if (emptyState) {
            emptyState.classList.add("show");
        }

        return;
    }

    if (emptyState) {
        emptyState.classList.remove("show");
    }


    transactions.forEach(transaction => {

        const amount = Number(transaction.amount) || 0;

        const isCredit = amount >= 0;

        const item = document.createElement("div");

        item.className = "activity-item";

        item.dataset.type = isCredit ? "earning" : "withdrawal";

        item.style.display = "flex";


        item.innerHTML = `
            <div class="activity-icon">
                ${getTransactionIcon(transaction)}
            </div>

            <div class="activity-details">

                <div class="activity-title">
                    ${transaction.title || "Transaction"}
                </div>

                <div class="activity-date">
                    ${formatDate(transaction.date)}
                </div>

                ${
                    transaction.message
                    ? `<div class="activity-message">
                        ${transaction.message}
                    </div>`
                    : ""
                }

            </div>

            <div class="activity-amount ${isCredit ? "credit" : "debit"}">
                ${isCredit ? "+" : ""}${formatMoney(amount)}
            </div>
        `;

        activityList.appendChild(item);
    });
}


// ===============================
// LOAD ACTIVITY FROM SERVER
// ===============================

async function loadActivity() {

    try {

        const response = await fetch("/api/activity", {
            method: "GET",
            credentials: "include"
        });


        const data = await response.json();


        if (!response.ok) {

            if (response.status === 401) {
                window.location.href = "index.html";
                return;
            }

            throw new Error(data.message || "Unable to load activity.");
        }


        allTransactions = data.transactions || [];

        renderTransactions(allTransactions);


    } catch (error) {

        console.error("Activity error:", error);

        if (activityList) {

            activityList.innerHTML = `
                <div class="activity-error">
                    Unable to load transactions.
                    Please refresh the page.
                </div>
            `;
        }
    }
}


// ===============================
// FILTERS
// ===============================

const filters = document.querySelectorAll(".filter");


filters.forEach(filter => {

    filter.addEventListener("click", () => {

        // Remove active from every filter
        filters.forEach(button => {
            button.classList.remove("active");
        });

        // Make clicked filter active
        filter.classList.add("active");


        const selected = filter.dataset.filter;


        // Show everything
        if (selected === "all") {

            renderTransactions(allTransactions);

            return;
        }


        // Filter transactions
        const filteredTransactions = allTransactions.filter(transaction => {

            const amount = Number(transaction.amount) || 0;

            if (selected === "earning") {
                return amount >= 0;
            }

            if (selected === "withdrawal") {
                return amount < 0;
            }

            return true;
        });


        renderTransactions(filteredTransactions);

    });

});


// ===============================
// NAVIGATION
// ===============================

function goTo(page) {
    window.location.href = page;
}


// ===============================
// START
// ===============================

loadActivity();