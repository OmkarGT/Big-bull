# Deploying Big Bull

Step-by-step guide for the recommended setup: the React client on **Vercel** and the Express API +
MySQL on **Railway**, all from one GitHub repository.

```
Browser ──► Vercel (client/, static SPA)
              │  fetch https://<backend>/api/...
              ▼
           Railway (server/, Express API)  ──►  Railway (MySQL 8)
              private network only
```

## What runs where

| Piece | Host | Root directory | Build | Start |
| --- | --- | --- | --- | --- |
| React SPA | Vercel | `client` | `npm run build` | static files from `dist/` |
| Express API | Railway | `server` | `npm install` | `npm start` |
| MySQL 8 | Railway | — | — | managed container |

Both services come from the **same** repository, so each one needs its *Root Directory* set.
If you forget that, Vercel tries to build the server and Railway tries to run the client.

---

## 0. Prerequisites

- A GitHub account with this repository pushed to it
- A Railway account (railway.com) - the MySQL + backend run here
- A Vercel account (vercel.com) - the frontend runs here
- Node 18+ available locally, so you can run `npm run db:setup` if you prefer that over the dashboard

---

## 1. Push the repository to GitHub

```bash
git add .
git commit -m "Deployment configuration"
git push
```

`.env` files are gitignored and are **never** uploaded. Every production value is supplied by the
host instead (steps 3 and 5).

---

## 2. Railway - create the project and the database

1. Railway → **New Project** → **Provision MySQL** (the MySQL service), or add the
   `mysql-server` template.
2. Name the service **MySQL** (the name matters - you reference it as `${{MySQL.<VAR>}}` later).
3. Open the MySQL service's **Variables** tab. Depending on which MySQL service you added you will
   see one of:

   | Variable | Meaning |
   | --- | --- |
   | `DATABASE_URL` | full `mysql://user:pass@host:3306/db` string - use this one |
   | `MYSQL_URL` | same string, older plugin name |
   | `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` | the connection split into parts |

   The backend accepts **all** of these, so you do not have to hand-build a connection string.

4. Leave the database alone for now - there is no schema until step 4.

---

## 3. Railway - deploy the backend

1. **New Service** → **GitHub Repo** → select this repository.
2. **Settings → Root Directory** → `server`
3. **Settings → Build Command** → `npm install`
   **Settings → Start Command** → `npm start`
   (Railway's Node/RAILPACK builder usually detects both; set them explicitly if the service
   fails to boot.)
4. **Settings → Health Check Path** → `/api/health`

   The API serves this route with no auth - see `server/src/app.js:30`. Railway will not route
   traffic until it returns a 2xx.

5. **Variables → Raw / JSON**, add:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{MySQL.DATABASE_URL}}` |
   | `JWT_SECRET` | a long random string - `openssl rand -hex 32` |
   | `CLIENT_URL` | your Vercel URL, e.g. `https://big-bull-01.vercel.app` (no trailing slash) |
   | `NODE_ENV` | `production` |

   Do **not** set `PORT`. Railway injects it, and the server reads `process.env.PORT`
   (`server/src/config/env.js`). Setting it yourself is how services end up listening on the
   wrong port.

   `${{MySQL.DATABASE_URL}}` is Railway's *reference variable* syntax: it resolves to the live
   connection string of the MySQL service in the same project. If your database exposes
   `MYSQL_URL` instead, use `${{MySQL.MYSQL_URL}}`. The Variables tab shows the resolved value -
   if you still see the literal `${{...}}` text, the reference did not resolve.

6. **Settings → Networking → Generate Domain**. Note the URL, e.g.
   `https://big-bull-production.up.railway.app`.

7. Deploy. The first deploy fails on boot with `DATABASE_URL is not set` or a connection error
   until step 4 is done - that is expected.

---

## 4. Railway - create the schema (run this **once**)

The backend now repairs itself on boot: `server/src/config/ensureSchema.js` creates any missing
database, tables and demo stocks on every start (without deleting existing data). Deploying the
backend is therefore enough to recover from an empty/wiped MySQL volume - the API will no longer
return "Something went wrong on our side" on login/register.

The destructive reset below is only for **deliberately** wiping the database. The schema lives in
`database/schema.sql` + `database/seed.sql` and is applied by:

```bash
npm run db:setup
```

> **This command is destructive.** `schema.sql` drops and recreates every table, and `seed.sql`
> reloads the 12 demo stocks. Run it when provisioning the database, and again only when you
> deliberately want to wipe it. It is **not** a migration to run on every deploy.

Run it against the Railway database in one of these ways:

- **Dashboard (preferred):** open the backend service → **Run** / **Shell** → `npm run db:setup`.
  This runs inside Railway's private network, so `DATABASE_URL` resolves to the internal host.
- **Locally:** copy the MySQL service's `DATABASE_PUBLIC_URL`, then:

  ```bash
  DATABASE_URL="mysql://user:pass@public-host:port/big_bull" npm run db:setup
  ```

  This needs the TCP proxy enabled on the MySQL service.

You should see:

```
[db:setup] using existing database 'big_bull'
[db:setup] applied schema.sql
[db:setup] applied seed.sql
[db:setup] done. Start the server with: npm run dev
```

Two things the script already handles for you:

- **It never calls `CREATE DATABASE` if the database already exists.** A Railway application user
  owns its database but has no global `CREATE`, so issuing that statement would be denied. The
  script checks `INFORMATION_SCHEMA` first.
- **It connects without selecting a database**, so it works before `big_bull` exists.

It does **not** require `JWT_SECRET` - only a database connection.

---

## 5. Vercel - deploy the frontend

1. Vercel → **Add New → Project** → import the same repository.
2. **Settings → General → Root Directory** → `client`
3. **Framework Preset** → Vite. `client/vercel.json` already pins the rest:

   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "framework": "vite",
     "installCommand": "npm install",
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

   The rewrite is required - without it every deep link (`/dashboard`, `/login`) 404s on refresh.

4. **Settings → Environment Variables**:

   | Name | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://big-bull-production.up.railway.app/api` |

   Two rules that are easy to get wrong:

   - **It must end in `/api`.** Routes are declared as `/auth/login`, `/stocks`, `/trades/buy`
     relative to `baseURL` (`client/src/services/api.js:8`).
   - **It is baked in at build time.** Vite inlines `import.meta.env.VITE_API_URL` while
     building, so changing the variable requires a **redeploy**, not just a save.

5. Deploy and note the Vercel URL, e.g. `https://big-bull-01.vercel.app`.

---

## 6. Point the backend at the frontend (CORS)

The API only accepts requests whose `Origin` matches `CLIENT_URL`. Go back to the Railway backend
service and set:

```
CLIENT_URL=https://big-bull-01.vercel.app
```

- **No trailing slash.** The browser sends `Origin: https://big-bull-01.vercel.app` and the check
  is an exact string match. The server strips trailing slashes defensively
  (`server/src/app.js`), but keep the value clean anyway.
- **Comma-separate** multiple origins if you keep a preview deployment around:
  `https://big-bull-01.vercel.app,https://big-bull-git-fix.vercel.app`
- After changing it, **redeploy** the backend - environment variables are read at boot.

Then redeploy the frontend so it points at the backend URL from step 3.

---

## 7. Verify

Run these against your deployed URLs.

```bash
export API=https://big-bull-production.up.railway.app/api

# public - no token needed
curl -s $API/health
curl -s $API/stocks | head -c 300
curl -s $API/stocks/1
curl -s "$API/stocks/1/history?limit=5"

# register -> grab .token
TOKEN=$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Deploy Test","email":"deploy@example.com","password":"secret123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"deploy@example.com","password":"secret123"}'

curl -s -H "Authorization: Bearer $TOKEN" $API/auth/me
curl -s -H "Authorization: Bearer $TOKEN" $API/users/profile
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Renamed"}' $API/users/profile
curl -s -H "Authorization: Bearer $TOKEN" $API/portfolio
curl -s -H "Authorization: Bearer $TOKEN" "$API/trades?limit=10"

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"stockId":1,"quantity":5}' $API/trades/buy
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"stockId":1,"quantity":2}' $API/trades/sell
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"capital":250000}' $API/users/reset-capital
```

Then open the Vercel URL and confirm: the dashboard lists 12 stocks, prices tick every few
seconds, and a buy shows up under trade history.

**CORS check** (this is the one that silently breaks a deployed SPA):

```bash
curl -s -o /dev/null -D - -H "Origin: https://big-bull-01.vercel.app" $API/health \
  | grep -i access-control-allow-origin
```

You must see `access-control-allow-origin: https://big-bull-01.vercel.app`. If the header is
missing, `CLIENT_URL` on Railway does not match the origin the browser actually sends.

---

## Updating after the first deploy

| Change | What to do |
| --- | --- |
| Client or server code | Push to `git main`. Both hosts redeploy automatically. |
| `VITE_API_URL` | Change it in Vercel, then **redeploy** the frontend. |
| `CLIENT_URL`, `JWT_SECRET` | Change it in Railway, then **redeploy** the backend. |
| `database/schema.sql` or `seed.sql` | Run `npm run db:setup` **deliberately** - it wipes data. |
| A new env var | Add it to the host's Variables tab; the service redeploys on its own. |

---

## Why there is no `railway.json`

Railway's Config as Code (`railway.json` / `railway.toml`) is **deprecated** - existing files keep
working until 2026-12-01, and **new services cannot opt into it**. Every setting described above
therefore lives in the Railway dashboard (or in `.railway/railway.ts`, Railway's newer
Infrastructure-as-Code file). Adding a `railway.json` here would be silently ignored.

Vercel still reads `client/vercel.json`, so that file is kept and made explicit.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Invalid environment configuration: DATABASE_URL must be a MySQL connection string` | `DATABASE_URL` holds an HTTP URL or is missing the `mysql://` scheme | Set it to `${{MySQL.DATABASE_URL}}` on the Railway backend service |
| Boot log: `Database did not respond` / `ETIMEDOUT` | Wrong host in `DATABASE_URL`, or the reference variable never resolved | Open Railway Variables and confirm `${{MySQL.DATABASE_URL}}` shows a real host, not literal `${{...}}` |
| `ER_ACCESS_DENIED_ERROR` | Wrong user/password, or the reference points at another service | Check `${{MySQL.<VAR>}}` matches your MySQL service **name** |
| Login/register says "Something went wrong on our side" | Tables are missing - usually after the MySQL volume was wiped or ran out of disk | Redeploy the backend: `ensureSchema` recreates the database, tables and demo stocks on boot. Check the logs for `[db] schema ready` |
| `ER_BAD_DB_ERROR` / `Unknown database 'big_bull'` | Schema was never applied | Redeploy the backend (auto-recovery), or run `npm run db:setup` once (step 4) |
| MySQL storage fills up again | `price_history` was growing forever (12 rows per engine tick) | The engine now keeps `PRICE_HISTORY_RETENTION_HOURS` (default 6) and prunes older rows hourly. Lower it in the backend Variables tab if needed |
| `DROP command denied to user ... for table ...` | `db:setup` was run as the application user without DDL rights | Run it as the database's admin/root user |
| Browser console: CORS error, no `access-control-allow-origin` | `CLIENT_URL` does not match the Vercel origin | Set `CLIENT_URL` with **no trailing slash**, redeploy the backend (step 6) |
| Network tab shows requests to `http://localhost:5000/api` | `VITE_API_URL` was unset at build time | Set it on Vercel and **redeploy** the frontend |
| `404` on page refresh | The SPA rewrite is missing | Keep the `rewrites` block in `client/vercel.json` (step 5) |
| Health check times out | Wrong path, or the service listens on a hard-coded port | Path must be `/api/health`; never set `PORT` yourself |
| Dashboard says "No stocks available" | Seed data missing | Run `npm run db:setup`; check the service logs for `[db] connected to MySQL` |
| Prices never change | Price engine did not start | Look for `[price-engine] started` in the backend logs |
| `port 5000 in use` locally | A previous `npm run dev` is still running | Kill it, or change `PORT` in `server/.env` and update `VITE_API_URL` |

---

## Security notes

- `.env` files are gitignored - production secrets live only in the host's environment.
- `JWT_SECRET` must differ between environments and be long and random.
- Use Railway's **private** `DATABASE_URL`, not `DATABASE_PUBLIC_URL`, from the backend. The
  public URL is only for running `db:setup` from your own machine.
- The frontend only ever sees `VITE_API_URL`. Database credentials and the JWT secret stay on the
  server.
