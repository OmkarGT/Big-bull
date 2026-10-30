// Loads .env into process.env. Imported first by the rest of the app so
// the database URL / JWT_SECRET are always available when other modules run.
// On Railway (or any host) .env does not exist - the same variables are read
// straight from the process environment instead.
import './dotenv.js';
import { databaseUrlProblem, resolveDatabaseUrl } from './mysqlUrl.js';

const problems = [];

const dbProblem = databaseUrlProblem();
if (dbProblem) problems.push(`  - ${dbProblem}`);
if (!process.env.JWT_SECRET) problems.push('  - JWT_SECRET is not set');

if (problems.length > 0) {
  console.error(`\nInvalid environment configuration:\n${problems.join('\n')}\n`);
  console.error('Locally: copy server/.env.example to server/.env and fill in the values.');
  console.error('On Railway: set them under your service -> Variables tab.\n');
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: resolveDatabaseUrl(),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  priceEngineIntervalMs: Number(process.env.PRICE_ENGINE_INTERVAL_MS) || 7000,
  // How much simulated price history to keep. The engine writes 12 rows per
  // tick, so without a limit price_history fills the MySQL volume (which is
  // what happened on Railway). The chart only ever reads 300 points per stock.
  historyRetentionHours: Number(process.env.PRICE_HISTORY_RETENTION_HOURS) || 6,
  isProduction: process.env.NODE_ENV === 'production',
};
