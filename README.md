Pick a childcare is a free directory of childcare centers, licensed and non-licensed dayhomes. Parents can search for childcare providers in their area, see spots available, and join their waitlists

## Railway deployment

The backend uses MySQL. Keep the existing database unchanged until the Railway
copy and API have been verified.

1. Rotate any credentials that have appeared in tracked files. The local
   `backend/.env` is currently tracked; remove it from Git's index with
   `git rm --cached -- backend/.env` before committing, while keeping the local
   file. Ignoring it does not remove it from Git history.
2. In your Railway project, add a new MySQL service. Enable backups and wait for
   it to become healthy. Use a new, empty database as the migration target.
3. Back up the local database with MySQL's `mysqldump` and restore the dump into
   the Railway database before starting the API. From outside Railway, use the
   MySQL service's public TCP proxy connection details, not the private host.
   The proxy must be enabled temporarily in the service's **Settings > Networking**.
   Use password prompts rather than putting passwords in commands. Verify the
   tables and row counts on the Railway copy, keep the backup secure, and remove
   public database access after migration if it is no longer needed. Do not import
   into an existing database without first backing it up and checking for conflicts.
4. Add a GitHub-backed service for this repository. Set its root directory to
   `/backend` and its start command to
   `uvicorn main:app --host 0.0.0.0 --port $PORT`. In the API service's Railway
   variables, add these references, replacing `MySQL` with the actual database
   service name if different:

   ```text
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   ```

   Set `SECRET_KEY` to a new, long random secret in Railway. Do not commit it.
   Deploy the changes, generate a public domain for the API, and check its `/`
   and `/providers` endpoints. The API creates missing tables on startup but
   does not import existing data or migrate existing tables.
5. Build and redeploy the frontend with `VITE_API_BASE_URL` set to the API's
   HTTPS origin, without a trailing slash. Vite embeds this value at build time.
   Confirm providers, agencies and resources load from the new API.

Uploaded images are stored on the backend's filesystem in `backend/uploads`.
They are not part of a MySQL dump, and Railway service filesystems are ephemeral;
configure persistent storage and migrate any existing files before relying on
uploads in production.


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
