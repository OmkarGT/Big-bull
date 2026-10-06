import jwt from 'jsonwebtoken';
import { unauthorized } from './errors.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy server/.env.example to server/.env first.');
  process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** Create a signed token holding the user id. */
export function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/** Read the user id out of a token, or throw 401 if it is invalid/expired. */
export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    throw unauthorized('Session expired or invalid. Please log in again.');
  }
}

/** Pull the Bearer token out of an Authorization header. */
export function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
