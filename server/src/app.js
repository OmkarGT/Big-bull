import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

const app = express();

// CORS: only the configured frontend origin(s) may call the API.
// Trailing slashes are stripped - browsers send `Origin` without one, and the
// comparison is an exact string match, so `https://app.vercel.app/` would never
// equal `https://app.vercel.app`.
app.use(
  cors({
    origin: env.clientUrl
      .split(',')
      .map((value) => value.trim().replace(/\/+$/, ''))
      .filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));

// Simple request log - handy while developing.
app.use((req, _res, next) => {
  console.log(`[api] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check.
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'Big Bull API',
    market: 'simulated',
    message: 'Paper trading only. No real market data, no real money.',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stocks', stockRoutes);
// Mounted on /api so it serves /api/portfolio and /api/trades/*
app.use('/api', tradeRoutes);

// Unknown route -> JSON 404, then the centralized error handler.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
