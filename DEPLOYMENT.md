# Deploying to Vercel

The app uses PostgreSQL for accounts, payment sessions, and login sessions when `DATABASE_URL` is set. Local development continues to use `data/users.json` and in-memory sessions.

1. Create a PostgreSQL database (for example, a Neon database) and copy its pooled connection URL.
2. Before pushing, import existing local accounts from `data/users.json`. In PowerShell, set the connection URL and run:

   ```powershell
   $env:DATABASE_URL = "your pooled PostgreSQL connection URL"
   npm.cmd run migrate:users
   ```

   The import stops if the database already contains accounts. Keep the local `data/users.json` backup private and do not commit it.
3. Generate a session secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
4. In Vercel, add `DATABASE_URL` and `SESSION_SECRET` under **Project Settings → Environment Variables** for Production (and Preview if needed). Redeploy after setting them.
5. Push the code and deploy the project. `vercel.json` routes the website and API through the Express function.

The database schema is created automatically on the first request. Existing account passwords remain hashed; users can log in with their existing passwords after migration. Local purchases and receipt files are not migrated.
