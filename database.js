const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.NEXORA_DATA_DIR || path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const userSnapshots = new WeakMap();
const localPurchases = new Map();
const usePostgres = Boolean(process.env.DATABASE_URL);
let pool;
let initialization;

if (usePostgres) {
    const { Pool } = require("pg");
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000
    });
}

async function initializeDatabase() {
    if (!usePostgres) {
        if (process.env.VERCEL) {
            throw new Error("DATABASE_URL must be configured for Vercel deployments.");
        }
        fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(USERS_FILE)) {
            fs.writeFileSync(USERS_FILE, "[]");
        }
        return;
    }

    if (!initialization) {
        initialization = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS nexora_users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    data JSONB NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1,
                    created_order BIGSERIAL
                )
            `);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS nexora_purchases (
                    id TEXT PRIMARY KEY,
                    data JSONB NOT NULL
                )
            `);
        })().catch(error => {
            initialization = null;
            throw error;
        });
    }

    await initialization;
}

async function getUsers() {
    await initializeDatabase();

    if (!usePostgres) {
        return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }

    const result = await pool.query(
        "SELECT id, data, version FROM nexora_users ORDER BY created_order"
    );
    const snapshots = new Map();
    const users = result.rows.map(row => {
        const user = row.data;
        snapshots.set(user.id, {
            version: row.version,
            data: JSON.stringify(user)
        });
        return user;
    });
    userSnapshots.set(users, snapshots);
    return users;
}

async function saveUsers(users) {
    await initializeDatabase();

    if (!usePostgres) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        return;
    }

    const snapshots = userSnapshots.get(users) || new Map();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        for (const user of users) {
            const data = JSON.stringify(user);
            const previous = snapshots.get(user.id);
            if (previous && previous.data === data) {
                continue;
            }

            if (previous) {
                const result = await client.query(
                    `UPDATE nexora_users
                     SET email = $1, data = $2::jsonb, version = version + 1
                     WHERE id = $3 AND version = $4`,
                    [user.email.toLowerCase(), data, user.id, previous.version]
                );
                if (result.rowCount !== 1) {
                    throw new Error("Account data changed during this request. Please try again.");
                }
            } else {
                await client.query(
                    `INSERT INTO nexora_users (id, email, data)
                     VALUES ($1, $2, $3::jsonb)`,
                    [user.id, user.email.toLowerCase(), data]
                );
            }
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function importUsers(users) {
    if (!usePostgres) {
        throw new Error("Set DATABASE_URL before importing users.");
    }
    await initializeDatabase();

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const existing = await client.query("SELECT COUNT(*)::integer AS count FROM nexora_users");
        if (existing.rows[0].count !== 0) {
            throw new Error("The hosted database already contains accounts; import was stopped.");
        }
        for (const user of users) {
            if (!user.id || !user.email || !user.password) {
                throw new Error("The users file contains an account missing its ID, email, or password hash.");
            }
            await client.query(
                `INSERT INTO nexora_users (id, email, data)
                 VALUES ($1, $2, $3::jsonb)`,
                [String(user.id), String(user.email).trim().toLowerCase(), JSON.stringify(user)]
            );
        }
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function getPurchase(id) {
    await initializeDatabase();
    if (!usePostgres) {
        return localPurchases.get(id) || null;
    }
    const result = await pool.query(
        "SELECT data FROM nexora_purchases WHERE id = $1",
        [id]
    );
    return result.rows[0]?.data || null;
}

async function savePurchase(purchase) {
    await initializeDatabase();
    if (!usePostgres) {
        localPurchases.set(purchase.id, purchase);
        return;
    }
    await pool.query(
        `INSERT INTO nexora_purchases (id, data)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
        [purchase.id, JSON.stringify(purchase)]
    );
}

async function closeDatabase() {
    if (pool) {
        await pool.end();
    }
}

module.exports = {
    get pool() {
        return pool;
    },
    getUsers,
    saveUsers,
    importUsers,
    initializeDatabase,
    getPurchase,
    savePurchase,
    closeDatabase
};
