import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { conflict, unauthorized } from '../utils/errors.js';
import {
  DEFAULT_STARTING_CAPITAL,
  validateLogin,
  validateRegister,
} from '../utils/validation.js';

const SALT_ROUNDS = 10;

const PUBLIC_USER_COLUMNS = 'id, name, email, virtual_balance, created_at';

/** Shape a user row for the client (never leaks password_hash). */
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    virtual_balance: Number(user.virtual_balance),
    created_at: user.created_at,
  };
}

/** POST /api/auth/register */
export async function register(req, res) {
  const { name, email, password } = validateRegister(req.body);

  // email_key is the stored lower(email), so this stays case-insensitive just
  // like `lower(email) = lower($1)` was in the PostgreSQL version.
  const existing = await queryOne('SELECT id FROM users WHERE email_key = ?', [email]);
  if (existing) throw conflict('An account with that email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // MySQL has no RETURNING clause, so the new id comes back as insertId and the
  // row is read in a second statement.
  const result = await query(
    'INSERT INTO users (name, email, password_hash, virtual_balance) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, DEFAULT_STARTING_CAPITAL.toFixed(2)]
  );

  const user = await queryOne(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`, [
    result.insertId,
  ]);

  const token = signToken(user.id);

  res.status(201).json({
    success: true,
    message: 'Practice account created. You start with virtual money only.',
    token,
    user: publicUser(user),
  });
}

/** POST /api/auth/login */
export async function login(req, res) {
  const { email, password } = validateLogin(req.body);

  const user = await queryOne('SELECT * FROM users WHERE email_key = ?', [email]);

  // Always run a compare so timing does not reveal whether the email exists.
  const hash = user ? user.password_hash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const matches = await bcrypt.compare(password, hash);

  if (!user || !matches) throw unauthorized('Invalid email or password');

  const token = signToken(user.id);

  res.json({
    success: true,
    message: 'Logged in to the simulated market',
    token,
    user: publicUser(user),
  });
}

/** GET /api/auth/me - used on app load to restore the session. */
export async function me(req, res) {
  const user = await queryOne(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE id = ?`, [
    req.userId,
  ]);

  if (!user) throw unauthorized('This account no longer exists');

  res.json({ success: true, user: publicUser(user) });
}

/** POST /api/auth/logout - the client simply drops the token. */
export async function logout(_req, res) {
  res.json({
    success: true,
    message: 'Logged out. This is a demo market, nothing was settled.',
  });
}
