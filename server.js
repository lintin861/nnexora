const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const app = express();
const PORT = Number(process.env.PORT) || 5500;
const KEY_PRICE = 7950;
const KEY_EXPIRY_MS = 15 * 60 * 1000;
const SURPRISE_BONUS = 10000;
const SURPRISE_BONUS_COOLDOWN_MS = 3 * 60 * 1000;
const REFERRAL_REWARD = 4500;

// =========================
// PATHS
// =========================

const DATA_DIR = process.env.NEXORA_DATA_DIR || path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const RECEIPTS_DIR = path.join(DATA_DIR, "receipts");
const KEY_PURCHASES = new Map();

// =========================
// CREATE DATA FOLDER/FILE
// =========================

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]");
}

if (!fs.existsSync(RECEIPTS_DIR)) {
    fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

// =========================
// DATA HELPERS
// =========================

function getUsers() {
    try {
        return JSON.parse(
            fs.readFileSync(USERS_FILE, "utf8")
        );
    } catch (error) {
        console.error("Could not read users.json:", error);
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2)
    );
}

function createReferralCode(users) {
    let code;
    do {
        code = `NXR-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    } while (users.some(user => user.referralCode === code));
    return code;
}

// =========================
// APP MIDDLEWARE
// =========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "nexora-school-project-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, RECEIPTS_DIR),
        filename: (req, file, cb) => {
            const extension = path.extname(file.originalname) || ".png";
            cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
        }
        cb(null, true);
    }
});

// Serve your public folder
app.use(express.static(path.join(__dirname, "public")));

// =========================
// AUTH MIDDLEWARE
// =========================

function requireAuth(req, res, next) {

    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            message: "Please login first."
        });
    }

    next();
}

// =========================
// CREATE ACCOUNT
// =========================

app.post("/api/register", async (req, res) => {

    try {

        const {
            username,
            email,
            password
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please fill in all fields."
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanUsername.length < 3) {
            return res.status(400).json({
                message: "Username must be at least 3 characters."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters."
            });
        }

        const users = getUsers();
        const referralCode = String(req.body.referralCode || "").trim().toUpperCase();
        const referrer = referralCode
            ? users.find(user => user.referralCode === referralCode)
            : null;

        const existingUser = users.find(
            user =>
                String(user.email).toLowerCase() === cleanEmail
        );

        if (existingUser) {
            return res.status(400).json({
                message: "An account with this email already exists."
            });
        }

        if (referralCode && !referrer) {
            return res.status(400).json({
                message: "That referral code is invalid."
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 10);

        const now = new Date().toISOString();
        const newUser = {

            id: crypto.randomUUID(),

            username: cleanUsername,

            email: cleanEmail,

            password: passwordHash,

            referralCode: createReferralCode(users),

            referredBy: referrer ? referrer.id : null,

            balance: 50000,

            createdAt: now,

            bonuses: {

                welcome: {

                    amount: 50000,

                    claimed: true,

                    claimedAt: now

                }

            },

            transactions: [{
                id: crypto.randomUUID(),
                type: "credit",
                title: "Welcome Bonus",
                amount: 50000,
                date: now,
                status: "successful",
                message: "Welcome bonus added when your account was created."
            }]

        };

        users.push(newUser);

        if (referrer) {
            referrer.balance = Number(referrer.balance || 0) + REFERRAL_REWARD;
            if (!Array.isArray(referrer.transactions)) {
                referrer.transactions = [];
            }
            referrer.transactions.unshift({
                id: crypto.randomUUID(),
                type: "credit",
                title: "Referral Reward",
                amount: REFERRAL_REWARD,
                date: now,
                status: "successful",
                message: `Reward for referring ${newUser.username}.`
            });
        }

        saveUsers(users);

        // Automatically log the new user in
        req.session.userId = newUser.id;

        res.json({
            success: true,
            message: "Account created successfully.",
            welcomeBonusGranted: true,
            welcomeBonusAmount: 50000,
            referralRewardGranted: Boolean(referrer),
            referralRewardAmount: referrer ? REFERRAL_REWARD : 0
        });

    } catch (error) {

        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            message: "Server error."
        });

    }

});

// =========================
// LOGIN
// =========================

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter your email and password."
            });
        }

        const users = getUsers();

        const cleanEmail =
            email.trim().toLowerCase();

        const user = users.find(
            u =>
                String(u.email).toLowerCase() === cleanEmail
        );

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const passwordCorrect =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        req.session.userId = user.id;

        res.json({
            success: true,
            message: "Login successful."
        });

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            message: "Server error."
        });

    }

});

// =========================
// ACCOUNT SECURITY
// =========================

app.get("/api/security", requireAuth, (req, res) => {
    const user = getUsers().find(user => user.id === req.session.userId);

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    res.json({
        username: user.username,
        email: user.email
    });
});

app.post("/api/security/password", requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (typeof currentPassword !== "string" || typeof newPassword !== "string" ||
            currentPassword.length === 0 || newPassword.length < 6) {
            return res.status(400).json({
                message: "Enter your current password and a new password with at least 6 characters."
            });
        }

        const users = getUsers();
        const user = users.find(user => user.id === req.session.userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.status(400).json({
                message: "Your current password is incorrect."
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        saveUsers(users);
        res.json({
            success: true,
            message: "Your password was updated."
        });
    } catch (error) {
        console.error("PASSWORD UPDATE ERROR:", error);
        res.status(500).json({
            message: "Could not update your password."
        });
    }
});

app.post("/api/security/email", requireAuth, async (req, res) => {
    try {
        const email = typeof req.body.email === "string"
            ? req.body.email.trim().toLowerCase()
            : "";
        const currentPassword = typeof req.body.currentPassword === "string"
            ? req.body.currentPassword
            : "";

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !currentPassword) {
            return res.status(400).json({
                message: "Enter a valid email address and your current password."
            });
        }

        const users = getUsers();
        const user = users.find(user => user.id === req.session.userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.status(400).json({
                message: "Your current password is incorrect."
            });
        }

        if (users.some(other => other.id !== user.id && other.email.toLowerCase() === email)) {
            return res.status(409).json({
                message: "That email address is already in use."
            });
        }

        user.email = email;
        saveUsers(users);
        res.json({
            success: true,
            email: user.email,
            message: "Your email address was updated."
        });
    } catch (error) {
        console.error("EMAIL UPDATE ERROR:", error);
        res.status(500).json({
            message: "Could not update your email address."
        });
    }
});

// =========================
// REFERRALS
// =========================

app.get("/api/referrals", requireAuth, (req, res) => {
    const users = getUsers();
    const user = users.find(user => user.id === req.session.userId);
    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    let changed = false;
    users.forEach(account => {
        if (!account.referralCode) {
            account.referralCode = createReferralCode(users);
            changed = true;
        }
    });
    if (changed) {
        saveUsers(users);
    }

    const referrals = users.filter(account => account.referredBy === user.id);
    const totalEarned = (user.transactions || [])
        .filter(transaction => transaction.title === "Referral Reward")
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

    const leaderboard = users
        .map(account => ({
            username: account.username,
            referralCode: account.referralCode,
            referrals: users.filter(referred => referred.referredBy === account.id).length
        }))
        .filter(account => account.referrals > 0)
        .sort((first, second) => second.referrals - first.referrals)
        .slice(0, 5);

    res.json({
        referralCode: user.referralCode,
        referralCount: referrals.length,
        totalEarned,
        rewardPerReferral: REFERRAL_REWARD,
        leaderboard
    });
});

// =====================================
// SURPRISE BONUS
// =====================================

app.get("/api/surprise-bonus", requireAuth, (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.id === req.session.userId);

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    const nextAvailableAt = user.bonuses?.surprise?.nextAvailableAt || null;
    const nextAvailableTime = Date.parse(nextAvailableAt);
    const remaining = Number.isFinite(nextAvailableTime)
        ? Math.max(0, nextAvailableTime - Date.now())
        : 0;

    res.json({
        available: remaining === 0,
        amount: SURPRISE_BONUS,
        nextAvailableAt: remaining > 0 ? nextAvailableAt : null,
        remaining
    });
});


app.post("/api/surprise-bonus/claim", requireAuth, (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.id === req.session.userId);

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    const nextAvailableAt = user.bonuses?.surprise?.nextAvailableAt || null;
    const nextAvailableTime = Date.parse(nextAvailableAt);
    const remaining = Number.isFinite(nextAvailableTime)
        ? nextAvailableTime - Date.now()
        : 0;

    if (remaining > 0) {
        return res.status(400).json({
            message: "Your next surprise bonus is not ready yet.",
            nextAvailableAt,
            remaining
        });
    }

    const now = new Date();
    const nextClaim = new Date(now.getTime() + SURPRISE_BONUS_COOLDOWN_MS);
    user.balance = Number(user.balance || 0) + SURPRISE_BONUS;
    user.bonuses = user.bonuses || {};
    user.bonuses.surprise = {
        lastClaimedAt: now.toISOString(),
        nextAvailableAt: nextClaim.toISOString()
    };
    if (!Array.isArray(user.transactions)) {
        user.transactions = [];
    }

    user.transactions.unshift({
        id: crypto.randomUUID(),
        type: "credit",
        title: "Surprise Bonus",
        amount: SURPRISE_BONUS,
        date: now.toISOString(),
        status: "successful",
        message: "Surprise bonus claimed successfully."
    });

    saveUsers(users);

    res.json({
        success: true,
        message: "Surprise bonus claimed successfully!",
        amount: SURPRISE_BONUS,
        balance: user.balance,
        nextAvailableAt: nextClaim.toISOString()
    });
});


// =========================
// CURRENT USER
// =========================

app.get("/api/me", requireAuth, (req, res) => {

    const users = getUsers();

    const user = users.find(
        u => u.id === req.session.userId
    );

    if (!user) {

        req.session.destroy(() => {});

        return res.status(401).json({
            message: "User not found."
        });

    }

    res.json({

        id: user.id,

        username: user.username,

        email: user.email,

        balance: Number(user.balance || 0),

        createdAt: user.createdAt

    });

});


// =========================
// TAP TO EARN
// =========================

const TAP_REWARD = 6440;
const TAP_COOLDOWN = 20 * 1000; // 20 seconds

app.get("/api/earn/status", requireAuth, (req, res) => {

    const users = getUsers();

    const user = users.find(
        u => u.id === req.session.userId
    );

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    const lastTap = user.earn?.lastTap
        ? new Date(user.earn.lastTap).getTime()
        : 0;

    const now = Date.now();

    const timePassed = now - lastTap;

    const remaining = Math.max(
        0,
        TAP_COOLDOWN - timePassed
    );

    res.json({
        canTap: remaining === 0,
        reward: TAP_REWARD,
        cooldown: TAP_COOLDOWN,
        remaining
    });

});


app.post("/api/earn/tap", requireAuth, (req, res) => {

    const users = getUsers();

    const user = users.find(
        u => u.id === req.session.userId
    );

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    // Create earn object if it doesn't exist
    if (!user.earn) {
        user.earn = {
            lastTap: null
        };
    }

    const now = Date.now();

    const lastTap = user.earn.lastTap
        ? new Date(user.earn.lastTap).getTime()
        : 0;

    const timePassed = now - lastTap;

    // Still on cooldown
    if (lastTap && timePassed < TAP_COOLDOWN) {

        const remaining =
            TAP_COOLDOWN - timePassed;

        return res.status(429).json({

            success: false,

            message:
                "You need to wait before tapping again.",

            remaining,

            reward: TAP_REWARD

        });

    }

    // =========================
    // GIVE ₦6,440
    // =========================

    user.balance =
        Number(user.balance || 0) +
        TAP_REWARD;

    // Save tap time
    user.earn.lastTap =
        new Date().toISOString();

    // Make sure transactions exists
    if (!Array.isArray(user.transactions)) {
        user.transactions = [];
    }

    // Save transaction
    user.transactions.unshift({

        id: crypto.randomUUID(),

        type: "credit",

        title: "Tap to Earn",

        amount: TAP_REWARD,

        date: new Date().toISOString()

    });

    saveUsers(users);

    res.json({

        success: true,

        message:
            "₦6,440 has been added to your balance.",

        reward: TAP_REWARD,

        balance:
            Number(user.balance),

        remaining:
            TAP_COOLDOWN

    });

});
// =========================
// DASHBOARD
// =========================

app.get("/api/index", requireAuth, (req, res) => {

    const users = getUsers();

    const user = users.find(
        u => u.id === req.session.userId
    );

    if (!user) {

        return res.status(401).json({
            message: "User not found."
        });

    }

    const userTransactions =
        Array.isArray(user.transactions)
            ? [...user.transactions]
            : [];

    userTransactions.sort(
        (a, b) =>
            new Date(b.date || b.createdAt) -
            new Date(a.date || a.createdAt)
    );

    const totalEarnings =
        userTransactions
            .filter(
                transaction =>
                    Number(transaction.amount) > 0
            )
            .reduce(
                (total, transaction) =>
                    total +
                    Number(transaction.amount),
                0
            );

    const today = new Date();

    const todayEarnings =
        userTransactions
            .filter(transaction => {

                const transactionDate =
                    new Date(
                        transaction.date ||
                        transaction.createdAt
                    );

                return (
                    transactionDate.getDate() ===
                        today.getDate() &&

                    transactionDate.getMonth() ===
                        today.getMonth() &&

                    transactionDate.getFullYear() ===
                        today.getFullYear()
                );

            })
            .filter(
                transaction =>
                    Number(transaction.amount) > 0
            )
            .reduce(
                (total, transaction) =>
                    total +
                    Number(transaction.amount),
                0
            );

    res.json({

        user: {

            id: user.id,

            username: user.username,

            email: user.email,

            balance:
                Number(user.balance || 0)

        },

        balance:
            Number(user.balance || 0),

        totalEarnings,

        todayEarnings,

        transactions:
            userTransactions.slice(0, 10)

    });

});

// =========================
// GET BONUSES
// =========================

app.get("/api/bonuses", requireAuth, (req, res) => {

    const users = getUsers();

    const user = users.find(
        u => u.id === req.session.userId
    );

    if (!user) {

        return res.status(404).json({
            message: "User not found."
        });

    }

    let welcomeBonusGrantedNow = false;
    const welcome = user.bonuses?.welcome;

    if (welcome && !welcome.claimed) {
        const amount = Number(welcome.amount) || 50000;
        const now = new Date().toISOString();
        user.balance = Number(user.balance || 0) + amount;
        welcome.claimed = true;
        welcome.claimedAt = now;
        if (!Array.isArray(user.transactions)) {
            user.transactions = [];
        }
        user.transactions.unshift({
            id: crypto.randomUUID(),
            type: "credit",
            title: "Welcome Bonus",
            amount,
            date: now,
            status: "successful",
            message: "Welcome bonus added to your account."
        });
        saveUsers(users);
        welcomeBonusGrantedNow = true;
    }

    res.json({
        welcome:
            user.bonuses?.welcome || null,
        welcomeBonusGrantedNow,
        balance: Number(user.balance || 0)
    });

});

// =========================
// CLAIM WELCOME BONUS
// =========================

app.post(
    "/api/bonus/welcome/claim",
    requireAuth,
    (req, res) => {

        const users = getUsers();

        const user = users.find(
            u => u.id === req.session.userId
        );

        if (!user) {

            return res.status(404).json({
                message: "User not found."
            });

        }

        if (
            !user.bonuses ||
            !user.bonuses.welcome
        ) {

            return res.status(400).json({
                message:
                    "Welcome bonus is not available."
            });

        }

        if (user.bonuses.welcome.claimed) {

            return res.status(400).json({
                message:
                    "Welcome bonus has already been claimed."
            });

        }

        const amount =
            Number(
                user.bonuses.welcome.amount
            );

        // Add bonus
        user.balance =
            Number(user.balance || 0) +
            amount;

        // Mark claimed
        user.bonuses.welcome.claimed = true;

        user.bonuses.welcome.claimedAt =
            new Date().toISOString();

        // Make sure transactions exists
        if (!Array.isArray(user.transactions)) {
            user.transactions = [];
        }

        // Record transaction
        user.transactions.unshift({

            id: crypto.randomUUID(),

            type: "credit",

            title: "Welcome Bonus",

            amount: amount,

            date: new Date().toISOString()

        });

        saveUsers(users);

        res.json({

            success: true,

            message:
                "Welcome bonus claimed successfully.",

            amount: amount,

            balance:
                Number(user.balance)

        });

    }
);


// =========================
// ACTIVITY
// =========================

app.get("/api/activity", requireAuth, (req, res) => {

    const users = getUsers();

    const user = users.find(
        u => u.id === req.session.userId
    );

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    const transactions =
        Array.isArray(user.transactions)
            ? [...user.transactions]
            : [];

    transactions.sort(
        (a, b) =>
            new Date(b.date || b.createdAt) -
            new Date(a.date || a.createdAt)
    );

    res.json({
        success: true,
        transactions
    });

});

// =========================
// NEXORA KEY PURCHASES
// =========================

app.post("/api/key-purchases", requireAuth, (req, res) => {
    const users = getUsers();
    const user = users.find(u => u.id === req.session.userId);

    if (!user) {
        return res.status(404).json({
            error: "User not found."
        });
    }

    const purchaseId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + KEY_EXPIRY_MS).toISOString();

    const purchase = {
        id: purchaseId,
        userId: user.id,
        amount: KEY_PRICE,
        expiresAt,
        paymentDetails: {
            bankName: "MOMO PSB",
            accountNumber: "7049519535",
            accountName: "Augustine ekukwu"
        },
        status: "pending",
        createdAt: new Date().toISOString()
    };

    KEY_PURCHASES.set(purchaseId, purchase);

    res.json({
        purchaseId,
        amount: purchase.amount,
        expiresAt,
        paymentDetails: purchase.paymentDetails
    });
});

app.post("/api/key-purchases/:purchaseId/receipt", requireAuth, (req, res) => {
    const purchase = KEY_PURCHASES.get(req.params.purchaseId);

    if (!purchase) {
        return res.status(404).json({
            error: "Payment session not found."
        });
    }

    if (purchase.userId !== req.session.userId) {
        return res.status(403).json({
            error: "This payment session does not belong to you."
        });
    }

    if (Date.now() >= new Date(purchase.expiresAt).getTime()) {
        return res.status(400).json({
            error: "This payment session has expired."
        });
    }

    const uploadReceipt = upload.single("receipt");

    uploadReceipt(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                error: error.message || "Could not upload receipt."
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: "Please upload a valid receipt image."
            });
        }

        purchase.status = "submitted";
        purchase.receipt = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            uploadedAt: new Date().toISOString()
        };
        purchase.reference = `NX-${Date.now().toString(36).toUpperCase()}`;

        res.json({
            success: true,
            reference: purchase.reference
        });
    });
});


// =========================
// WITHDRAWAL
// DEMO ONLY
// =========================

app.post("/api/withdraw", requireAuth, (req, res) => {

    const users = getUsers();

    const user = users.find(
        u => u.id === req.session.userId
    );

    if (!user) {
        return res.status(404).json({
            message: "User not found."
        });
    }

    const amount = Number(req.body.amount);

    const supportedBanks = [
        "access",
        "gtb",
        "firstbank",
        "uba",
        "zenith",
        "opay",
        "kuda",
        "palmpay",
        "fidelity",
        "fcmb",
        "union",
        "stanbic",
        "sterling",
        "wema",
        "ecobank"
    ];
    const bank = String(req.body.bank || "");
    const accountName = String(req.body.accountName || "").trim();
    const accountNumber = String(req.body.accountNumber || "");

    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
            message: "Enter a valid withdrawal amount."
        });
    }

    if (accountName.length < 2 || accountName.length > 100) {
        return res.status(400).json({
            message: "Enter a valid account holder name."
        });
    }

    if (!supportedBanks.includes(bank) || !/^\d{10}$/.test(accountNumber)) {
        return res.status(400).json({
            message: "Select a valid bank and enter a 10-digit account number."
        });
    }

    const balance = Number(user.balance || 0);

    if (amount > balance) {
        return res.status(400).json({
            message: "Insufficient balance."
        });
    }

    // Deduct immediately
    user.balance = balance - amount;

    if (!Array.isArray(user.transactions)) {
        user.transactions = [];
    }

    // Record withdrawal
    user.transactions.unshift({

        id: crypto.randomUUID(),

        type: "debit",

        title: "Withdrawal",

        amount: -amount,

        date: new Date().toISOString(),

        status: "successful",

        message:
            "withdrawal successful."

    });

    saveUsers(users);

    res.json({

        success: true,

        message:
            "Demo withdrawal of ₦" + amount.toLocaleString("en-NG") +
            " was successful. No real bank transfer was made.",

        amount: amount,

        balance: user.balance

    });

});

// =========================
// LOGOUT
// =========================

app.post("/api/logout", (req, res) => {

    req.session.destroy(error => {

        if (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );

            return res.status(500).json({
                message:
                    "Could not logout."
            });

        }

        res.clearCookie("connect.sid");

        res.json({
            success: true
        });

    });

});

// =========================
// API 404 HANDLER
// =========================

app.use("/api", (req, res) => {

    res.status(404).json({

        message:
            `API route not found: ${req.method} ${req.originalUrl}`

    });

});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {

    console.log("");
    console.log("==============================");
    console.log(" Nexora School Project");
    console.log("==============================");
    console.log(
        `Server: http://localhost:${PORT}`
    );
    console.log(
        `Login:  http://localhost:${PORT}/`
    );
    console.log("==============================");
    console.log("");

});