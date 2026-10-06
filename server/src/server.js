import app from './app.js';
import { env } from './config/env.js';
import { pool, testConnection } from './config/db.js';
import { startPriceEngine, stopPriceEngine } from './services/priceEngine.js';

let server;

async function bootstrap() {
  try {
    const connected = await testConnection();
    if (!connected) throw new Error('Database did not respond to a test query');
    console.log('[db] connected to MySQL');

    server = app.listen(env.port, () => {
      console.log(`[api] Big Bull server listening on http://localhost:${env.port}`);
      console.log(`[api] allowed client origin: ${env.clientUrl}`);
    });

    // A port clash should explain itself instead of dumping a stack trace.
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`[api] Port ${env.port} is already in use.`);
        console.error('[api] Stop the other process, or change PORT in server/.env (and update VITE_API_URL).');
      } else {
        console.error('[api] Server error:', error.message);
      }
      process.exit(1);
    });

    // The simulated market starts ticking with the server.
    startPriceEngine();
  } catch (error) {
    console.error('[api] Failed to start:', error.message);
    console.error('[api] Check that server/.env has a valid DATABASE_URL and that you ran database/schema.sql');
    process.exit(1);
  }
}

/** Stop the engine, close HTTP connections and the DB pool. */
function shutdown(signal) {
  console.log(`\n[api] ${signal} received, shutting down...`);
  stopPriceEngine();

  const closeServer = () => {
    pool.end().finally(() => process.exit(0));
  };

  if (server) server.close(closeServer);
  else closeServer();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Safety net: a stray rejection should be logged, not crash the demo server.
process.on('unhandledRejection', (reason) => {
  console.error('[api] Unhandled promise rejection:', reason);
});

bootstrap();
