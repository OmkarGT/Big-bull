### The 12 fictional companies

| Symbol | Company | Seed price (INR) |
| --- | --- | ---: |
| CHINTU | Chintu Sabun | 180 |
| GODI | Godi Chai | 420 |
| RAMU | Ramu Chaddar | 275 |
| MAYA | Maya Sabji | 145 |
| GRAMIN | Gramin Bank | 1250 |
| TUKTUK | Tuktuk Transports | 680 |
| PW | Physical Wallah | 2150 |
| KABJI | Kabji Gas Suppliers | 1780 |
| IRTCT | IRTCT | 3250 |
| CHASMA | Chasmaghar | 920 |
| MAHASHAKTI | Mahashakti Tyres | 3850 |
| BULL | Big Bull Industries | 500 |

---

## Technology stack

**Frontend** - React 18, Vite 7, Tailwind CSS 3, React Router 7, Axios, Recharts, Lucide React

**Backend** - Node.js, Express 4, MySQL 8, `mysql2`, JSON Web Tokens, `bcryptjs`, dotenv, cors

Deliberately **not** used: TypeScript, Next.js, Redux, Prisma, MongoDB, Firebase, Supabase,
WebSockets. The project stays small and readable on purpose.

> `bcryptjs` is the pure-JavaScript build of `bcrypt`. It has the same API and hashing format,
> but installs without a native compiler - handy on Windows and for a college project.
> To use native `bcrypt` instead: `npm i bcrypt` in `server/` and swap the import.

> `mysql2` is the standard MySQL driver for Node. It is a pure-JavaScript client, so it
> installs with no native compiler and no extra build tools. The app talks to **MySQL 8.0
> or newer** because the schema uses `CHECK` constraints, which older MySQL silently ignored.

---

## Folder structure

```
big-bull/
  client/
    src/
      components/
        Navbar.jsx
        ProtectedRoute.jsx
        StockCard.jsx
        StockTable.jsx
        PriceChart.jsx
        TradePanel.jsx
        PortfolioCard.jsx
        Loading.jsx
      pages/
        Login.jsx
        Signup.jsx
        Dashboard.jsx
        Portfolio.jsx
        Profile.jsx
        NotFound.jsx
      context/
        AuthContext.jsx
      services/
        api.js
      utils/
        formatCurrency.js
        formatNumber.js
      App.jsx
      main.jsx
      index.css
    public/
      logo.svg
    package.json
    vite.config.js
    tailwind.config.js
    postcss.config.js
    .env.example

  server/
    scripts/
      migrate.js
    src/
      config/
        env.js
        db.js
        mysqlUrl.js
      middleware/
        authMiddleware.js
        errorMiddleware.js
      controllers/
        authController.js
        userController.js
        stockController.js
        tradeController.js
      routes/
        authRoutes.js
        userRoutes.js
        stockRoutes.js
        tradeRoutes.js
      services/
        priceEngine.js
        portfolioService.js
        tradeService.js
      utils/
        jwt.js
        validation.js
        errors.js
        asyncHandler.js
      app.js
      server.js
    package.json
    .env.example

  database/
    schema.sql
    seed.sql

  .gitignore
  README.md
```

### If you do not have MySQL installed

Any of these is fine:

| Option | What to do |
| --- | --- |
| **Official installer** | Install MySQL 8 (or MySQL Installer with the Server package) from [dev.mysql.com](https://dev.mysql.com/downloads/installer/). The installer sets the `root` password for you. |
| **Docker** | `docker run -d --name bigbull-mysql -e MYSQL_ROOT_PASSWORD=123 -p 3306:3306 mysql:8` |
| **A managed cloud database** | Create a free MySQL database (PlanetScale, Aiven, Railway, TiDB Cloud), then put its `mysql://...` URL in `DATABASE_URL`. |

Remember the root password you set - it goes into `DATABASE_URL` in step 4.

---

## Local setup

### 1. Install dependencies

From the `big-bull/` folder:

```bash
npm run install-all
```

This installs the server and client dependencies together. You can also run them separately:

```bash
cd server && npm install
cd client && npm install
```

### 2. Configure environment variables

**Backend** - copy the example file and edit it:

```bash
cd server
cp .env.example .env        # macOS / Linux
copy .env.example .env      # Windows
```

```env
PORT=5000
DATABASE_URL=mysql://root:yourpassword@localhost:3306/big_bull
JWT_SECRET=change_this_to_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
PRICE_ENGINE_INTERVAL_MS=7000
```

`DATABASE_URL` is a standard `mysql://` connection string:

```
mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE
                 root      yourpass  localhost  3306   big_bull
```

**Frontend** - copy the example file too:

```bash
cd client
cp .env.example .env        # macOS / Linux
copy .env.example .env      # Windows
```

```env
VITE_API_URL=http://localhost:5000/api
```

> `.env` files are gitignored. Never commit database credentials or `JWT_SECRET`.
> The React app only ever sees `VITE_API_URL` - the database URL and JWT secret stay on the server.

### 3. Create the database and load the schema

From the `big-bull/` folder:

```bash
npm run db:setup
```

That runs `server/scripts/migrate.js`, which connects using `DATABASE_URL`, creates the database
if it does not exist yet, then applies `database/schema.sql` and `database/seed.sql` in order. It
works the same way on Windows, macOS and Linux, and needs no extra tooling.

`schema.sql` is re-runnable (it drops and recreates the tables). `seed.sql` is idempotent
(it uses `INSERT IGNORE`), so running `db:setup` twice leaves you with exactly one copy of the
12 stocks and their initial price history.

If you would rather use the MySQL client directly, create the database and run the two files
yourself:

```bash
mysql -u root -p -e "CREATE DATABASE big_bull CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p big_bull < database/schema.sql
mysql -u root -p big_bull < database/seed.sql
```

### 4. Run both apps

From the `big-bull/` folder:

```bash
npm run dev
```

Or run them separately in two terminals:

```bash
cd server && npm run dev     # nodemon, http://localhost:5000
cd client && npm run dev     # vite,     http://localhost:5173
```

Open **http://localhost:5173**, sign up with any email and password, and you start with
₹100,000 of virtual money.

### Package scripts

| Location | Script | What it does |
| --- | --- | --- |
| root | `npm run install-all` | install server + client dependencies |
| root | `npm run dev` | run backend and frontend together |
| root | `npm run db:setup` | create the database, then apply `schema.sql` and `seed.sql` |
| client | `npm run dev` | Vite dev server |
| client | `npm run build` | production build into `client/dist` |
| client | `npm run preview` | serve the production build locally |
| server | `npm run dev` | nodemon, restarts on change |
| server | `npm start` | normal start (used in production) |
| server | `npm run db:setup` | same as the root script, if you are already in `server/` |

---

## Environment variables

### Server (`server/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no (default `5000`) | Port the API listens on |
| `DATABASE_URL` | **yes** | MySQL connection string, e.g. `mysql://root:pass@localhost:3306/big_bull` |
| `JWT_SECRET` | **yes** | Secret used to sign tokens |
| `JWT_EXPIRES_IN` | no (default `7d`) | Token lifetime |
| `CLIENT_URL` | no (default `http://localhost:5173`) | Allowed frontend origin(s), comma separated |
| `PRICE_ENGINE_INTERVAL_MS` | no (default `7000`) | Simulated tick interval |
| `DATABASE_SSL` | no | Set to `true` for managed databases that require SSL |
| `NODE_ENV` | no | Set to `production` on your host |

The server exits with a clear message if `DATABASE_URL` or `JWT_SECRET` is missing.

### Client (`client/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | **yes** | Base URL of the backend API |

---

## API overview

All responses use one of two shapes:

```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "Insufficient virtual balance" }
```

`Protected` routes need an `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | no | Create account, returns token, starts with ₹100,000 |
| POST | `/api/auth/login` | no | Log in, returns token |
| POST | `/api/auth/logout` | no | Acknowledge logout (client drops the token) |
| GET | `/api/auth/me` | **yes** | Current user, used to restore the session |

### Users

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/users/profile` | **yes** | Profile + summary |
| PUT | `/api/users/profile` | **yes** | Update display name |
| POST | `/api/users/reset-capital` | **yes** | Set new virtual capital; **clears holdings and trade history** |

### Stocks (simulated)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/stocks` | no | All 12 stocks with price, change, % change, market status |
| GET | `/api/stocks/:id` | no | One stock |
| GET | `/api/stocks/:id/history?limit=60` | no | Recent simulated ticks for the chart |

### Portfolio & trades

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/portfolio` | **yes** | Cash, holdings, market value, P&L |
| GET | `/api/trades?limit=50` | **yes** | Trade history, newest first |
| POST | `/api/trades/buy` | **yes** | Body `{ stockId, quantity }` |
| POST | `/api/trades/sell` | **yes** | Body `{ stockId, quantity }` |

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Service status, no auth needed |

### Error responses

| Status | When |
| --- | --- |
| 400 | Validation failed (bad email, password, quantity, stock id or capital) |
| 401 | Missing, invalid or expired token, or wrong login |
| 404 | Unknown stock, user or route |
| 409 | Email already registered |
| 500 | Unexpected server error (logged, generic message returned) |

**The backend is authoritative.** The client only ever sends `{ stockId, quantity }`. Prices,
balances, totals and share ownership are all decided on the server, so a tampered request
cannot buy a share for ₹0.01.

---

## How the simulated price engine works

`server/src/services/priceEngine.js` starts with the Node server and ticks on an interval
(default 7 s). It is a plain random walk - there is no external market API.

For each stock, every tick:

1. Uses the current simulated price as the base
2. Picks a random movement scaled by a per-stock volatility (`±0.3%` for the fictional bank,
   `±0.9%` for the small fictional names), hard-capped at `±1%`
3. Computes `newPrice = currentPrice * (1 + movement)` and rounds to 2 decimals
4. Floors the price at ₹1 so it can never reach zero
5. Shifts `previous_price` to the old `current_price` (this is what the UI shows as change)
6. Inserts a row into `price_history` for the chart

The engine stops cleanly on `SIGINT`/`SIGTERM`. The frontend polls `/api/stocks` (and the
selected stock's history) roughly every 7 seconds - no WebSockets needed.

---

## Database design

Money is stored as `DECIMAL(14,2)` so there are no floating point rounding errors. The driver is
configured with `decimalNumbers: true`, so every money value arrives in the API response as a
JSON **number**, never a string.

| Table | Purpose |
| --- | --- |
| `users` | account, bcrypt `password_hash`, `virtual_balance` (CHECK >= 0) |
| `stocks` | the 12 fictional companies, `current_price` and `previous_price` |
| `holdings` | one row per user+stock, `quantity`, `average_buy_price` |
| `trades` | immutable audit log of every BUY/SELL |
| `price_history` | every simulated tick, used by the chart |

Constraints and indexes include: unique `users.email` (case-insensitive, via the generated
`email_key` column), unique `holdings(user_id, stock_id)`, an inline `ENUM('BUY','SELL')` on
`trades.type`, CHECK constraints on quantities and prices, and indexes on `holdings.user_id`,
`trades(user_id, created_at DESC)`, `price_history(stock_id, recorded_at DESC)`.

Everything is `ENGINE=InnoDB`, because the BUY/SELL transactions rely on InnoDB row locking
(`SELECT ... FOR UPDATE`) and real foreign keys.

#### PostgreSQL to MySQL notes

If you are comparing this to an earlier PostgreSQL version of the project, the schema is the
same in every way that matters, but the syntax differs:

| PostgreSQL | MySQL (this project) |
| --- | --- |
| `SERIAL PRIMARY KEY` | `INT NOT NULL AUTO_INCREMENT PRIMARY KEY` |
| `NUMERIC(14,2)` | `DECIMAL(14,2)` |
| `TIMESTAMPTZ` | `DATETIME` + session pinned to UTC |
| `NOW()` | `CURRENT_TIMESTAMP` |
| `CREATE TYPE trade_type AS ENUM (...)` | inline `ENUM('BUY','SELL')` on the column |
| `CREATE UNIQUE INDEX ... ON users (lower(email))` | generated column `email_key` + unique index |
| `ON CONFLICT ... DO NOTHING` | `INSERT IGNORE` |
| `$1, $2, ...` placeholders | `?` placeholders |
| `... RETURNING id, ...` | run the write, then `SELECT` the row back |
| `'BEGIN'` / `'COMMIT'` / `'ROLLBACK'` | `beginTransaction()` / `commit()` / `rollback()` |
| `COUNT(*)::int` | `COUNT(*)` |
| error code `23505` | `ER_DUP_ENTRY` |

> MySQL has no expression indexes, so case-insensitive email uniqueness is a
> `VARCHAR(255) GENERATED ALWAYS AS (lower(email)) STORED` column with a unique index on it.
> That is the same guarantee the old expression index gave, and the backend queries `email_key`
> so the index is actually used.

### P&L formulas

```
market value    = quantity x current price
cost value      = quantity x average buy price
unrealized P&L  = market value - cost value
portfolio value = available cash + sum(market value)
total P&L       = portfolio value - practice capital
```

### Consistency

Every BUY and SELL runs in a single InnoDB transaction that locks the user and stock rows,
so balance, holdings and trade records can never disagree - even if two requests arrive at the
same instant.

---

## Security

- Passwords hashed with `bcryptjs` (10 salt rounds); plaintext is never stored or logged
- JWT bearer tokens on every protected route, with expiry
- **All SQL is parameterized** (`?` placeholders) - user input is never concatenated into SQL
- All trading rules validated on the backend
- `CHECK` constraints as a final guard against negative balances, quantities and prices
- CORS locked to the configured frontend origin
- Secrets live in `.env`, which is gitignored; only `VITE_API_URL` reaches the browser
- Login responses are timing-safe (a dummy hash compare runs when the email does not exist)

---

## Deployment

### 1. Database

Create a managed MySQL database (PlanetScale, Aiven, Railway, Render, TiDB Cloud, Amazon RDS,
or plain MySQL) and run the two SQL files against it - either with the `mysql` client or by
pointing `DATABASE_URL` at it locally and running `npm run db:setup`. Copy the `mysql://...`
connection string into `DATABASE_URL`. If your host requires SSL, add `DATABASE_SSL=true`.

### 2. Backend (Render / Railway / Fly.io)

- Root directory: `server`
- Install: `npm install`
- Start: `npm start`
- Environment: `NODE_ENV=production`, `PORT` (provided by the host), `DATABASE_URL`
  (a `mysql://...` string), `JWT_SECRET` (long random string), `CLIENT_URL` (your frontend URL),
  `DATABASE_SSL=true` if needed

### 3. Frontend (Vercel / Netlify)

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment: `VITE_API_URL=https://<your-backend>/api`

Because the app uses client-side routing, add a rewrite so deep links do not 404:

- **Netlify** - `client/public/_redirects` with `/* /index.html 200`
- **Vercel** - `client/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Project rules this codebase follows

1. Business logic lives in backend services and controllers, never in React
2. The backend is authoritative for balances, prices, holdings and trades
3. The frontend never sees database credentials
4. All API calls go through `client/src/services/api.js`
5. Auth state lives in `client/src/context/AuthContext.jsx`
6. SQL lives in `database/`
7. Money is `DECIMAL`, and every calculation is rounded to 2 decimals
8. BUY/SELL use database transactions

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Missing environment variable(s): DATABASE_URL, JWT_SECRET` | Copy `server/.env.example` to `server/.env` and fill it in |
| `ECONNREFUSED` / `Database did not respond` | Make sure the MySQL server is running and `DATABASE_URL` is correct |
| `ER_ACCESS_DENIED_ERROR` | Wrong username or password in `DATABASE_URL`. Check the MySQL root password |
| `ER_BAD_DB_ERROR` / `Unknown database 'big_bull'` | The database does not exist - run `npm run db:setup`, which creates it |
| `getaddrinfo ENOTFOUND` | Wrong host in `DATABASE_URL`. Use `localhost` for a local server |
| `Access denied for user` when creating the database | Use a MySQL account that may `CREATE DATABASE`, or create it by hand first |
| Dashboard shows "No stocks available" | Run `npm run db:setup` to apply `schema.sql` and `seed.sql` |
| Prices never change | The price engine starts with the server - check the `[price-engine]` log lines |
| Frontend cannot reach the API | `VITE_API_URL` must include `/api`, and `CLIENT_URL` must match the browser origin |
| `port 5000 in use` | Change `PORT` in `server/.env` and update `VITE_API_URL` to match |
| CHECK constraints seem to be ignored | You are on MySQL before 8.0.16. Upgrade - older versions parse but never enforce `CHECK` |

### Useful MySQL commands

```bash
# connect
mysql -u root -p big_bull

# inside the shell
SHOW TABLES;
SELECT * FROM stocks;
SELECT id, name, email, virtual_balance FROM users;
SELECT t.id, u.email, s.symbol, t.type, t.quantity, t.price, t.created_at
  FROM trades t JOIN users u ON u.id = t.user_id JOIN stocks s ON s.id = t.stock_id
 ORDER BY t.created_at DESC;
SELECT COUNT(*) AS ticks FROM price_history;
```
