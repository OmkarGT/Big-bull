import { ApiError } from '../utils/errors.js';

/** 404 handler for unknown routes. */
export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Centralized error handler. Every failure leaves the API as JSON:
 *   { success: false, message: "..." }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _req, res, _next) {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  if (statusCode >= 500) {
    console.error('Server error:', error);
  }

  // MySQL duplicate key violation -> friendly conflict message.
  if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
    return res.status(409).json({ success: false, message: 'That record already exists' });
  }

  const message =
    statusCode >= 500 ? 'Something went wrong on our side. Please try again.' : error.message;

  res.status(statusCode).json({ success: false, message });
}

export default errorHandler;
