const fs = require("fs");
const path = require("path");
const { closeDatabase, importUsers } = require("../database");

async function main() {
    const usersFile = path.join(__dirname, "..", "data", "users.json");
    const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));

    if (!Array.isArray(users)) {
        throw new Error("data/users.json must contain an array of accounts.");
    }

    await importUsers(users);
    console.log(`Imported ${users.length} accounts into the hosted database.`);
}

main()
    .catch(error => {
        console.error("User migration failed:", error.message);
        process.exitCode = 1;
    })
    .finally(closeDatabase);
