import { extractBearerToken, verifyToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/errors.js';

/**
 * Blocks the request unless a valid `Authorization: Bearer <token>`
 * header is present, and attaches the matching user id to req.userId.
 */
export function protect(req, _res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return next(unauthorized('Not authenticated. Please log in.'));
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.id;
    return next();
  } catch (error) {
    return next(error); // verifyToken throws an ApiError(401)
  }
}

export default protect;
