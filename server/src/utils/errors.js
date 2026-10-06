// Small helpers so every controller can respond in the same shape:
//   success: true  -> { success: true,  message, data }
//   success: false -> { success: false, message }

/**
 * Thrown by controllers/services when a request cannot be fulfilled.
 * The centralized error middleware turns it into a JSON response.
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export const badRequest = (message) => new ApiError(400, message);
export const unauthorized = (message = 'Not authenticated') => new ApiError(401, message);
export const forbidden = (message = 'Not allowed') => new ApiError(403, message);
export const notFound = (message = 'Resource not found') => new ApiError(404, message);
export const conflict = (message) => new ApiError(409, message);
