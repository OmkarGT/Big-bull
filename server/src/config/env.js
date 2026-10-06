// Loads .env into process.env. Imported first by the rest of the app so
// DATABASE_URL / JWT_SECRET are always available when other modules run.
import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `\nMissing environment variable(s): ${missing.join(', ')}\n` +
      'Copy server/.env.example to server/.env and fill in the values.\n'
  );
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  priceEngineIntervalMs: Number(process.env.PRICE_ENGINE_INTERVAL_MS) || 7000,
  isProduction: process.env.NODE_ENV === 'production',
};
