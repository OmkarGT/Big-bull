import { badRequest } from './errors.js';

// Default practice capital handed to every new user (INR).
export const DEFAULT_STARTING_CAPITAL = 100000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trim + normalise an email so lookups are case-insensitive. */
export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/** Validates the signup payload. Returns clean values or throws ApiError(400). */
export function validateRegister(body = {}) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (name.length < 2) throw badRequest('Name must be at least 2 characters long');
  if (name.length > 100) throw badRequest('Name must be 100 characters or fewer');
  if (!EMAIL_PATTERN.test(email)) throw badRequest('Please provide a valid email address');
  if (password.length < 6) throw badRequest('Password must be at least 6 characters long');
  if (password.length > 100) throw badRequest('Password must be 100 characters or fewer');

  return { name, email, password };
}

/** Validates the login payload. */
export function validateLogin(body = {}) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!EMAIL_PATTERN.test(email)) throw badRequest('Please provide a valid email address');
  if (password.length === 0) throw badRequest('Password is required');

  return { email, password };
}

/** Validates the profile update payload. Only name is editable. */
export function validateProfileUpdate(body = {}) {
  const name = String(body.name || '').trim();
  if (name.length < 2) throw badRequest('Name must be at least 2 characters long');
  if (name.length > 100) throw badRequest('Name must be 100 characters or fewer');
  return { name };
}

/**
 * Validates a new practice capital amount. Must be a positive INR amount
 * that fits the NUMERIC(14,2) column (max 999,999,999,999.99).
 */
export function validateCapitalAmount(value) {
  const amount = Number(value);

  if (value === undefined || value === null || String(value).trim() === '') {
    throw badRequest('Practice capital amount is required');
  }
  if (!Number.isFinite(amount)) throw badRequest('Practice capital must be a valid number');
  if (amount <= 0) throw badRequest('Practice capital must be greater than zero');
  if (amount > 999999999999.99) throw badRequest('Practice capital is too large');

  return Number(amount.toFixed(2));
}

/** Validates a stock id coming from the URL. */
export function validateStockId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Invalid stock id');
  return id;
}

/** Validates a trade quantity: whole shares, at least 1. */
export function validateQuantity(value) {
  const quantity = Number(value);

  if (value === undefined || value === null || String(value).trim() === '') {
    throw badRequest('Quantity is required');
  }
  if (!Number.isFinite(quantity)) throw badRequest('Quantity must be a valid number');
  if (!Number.isInteger(quantity)) throw badRequest('Quantity must be a whole number of shares');
  if (quantity <= 0) throw badRequest('Quantity must be greater than zero');
  if (quantity > 1000000) throw badRequest('Quantity is too large for this demo');

  return quantity;
}
