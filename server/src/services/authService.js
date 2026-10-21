// authService.js - shopkeeper login using a JWT (JSON Web Token).
//
// How it works:
//   1. The shopkeeper sends the password once (POST /api/auth/login).
//   2. If it matches SHOPKEEPER_PASSWORD in .env, we give back a signed token,
//      like a wristband at an event: { role: "shopkeeper" }, signed with JWT_SECRET, valid for 8 hours.
//   3. The React app sends that token with every shopkeeper request ("Authorization: Bearer <token>").
//   4. The requireShopkeeper middleware checks the signature. Nobody can fake or edit a token
//      without knowing JWT_SECRET, so a valid token proves the person logged in.
//
// Customers don't log in; they only type their name (see DESIGN.md for this trade-off).

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import AppError from '../utils/AppError.js';
const TOKEN_LIFETIME = '8h'; // about one shop shift; after that, log in again

const loginSchema = z.object({
  password: z.string({ error: 'Enter the password' }).min(1, 'Enter the password'),
});

// Read the secrets when needed (not at import time), so a missing value gives a clear error.
function getConfig() {
  const { SHOPKEEPER_PASSWORD, JWT_SECRET } = process.env;
  if (!SHOPKEEPER_PASSWORD || !JWT_SECRET) {
    throw new AppError(503, 'Shopkeeper login is not set up (SHOPKEEPER_PASSWORD / JWT_SECRET missing in .env)');
  }
  return { password: SHOPKEEPER_PASSWORD, secret: JWT_SECRET };
}

// Compare two strings in "constant time": the check takes the same time whether the first
// or the last character is wrong, so an attacker can't guess the password from response times.
// We hash both first because timingSafeEqual needs inputs of equal length.
function safeEqual(a, b) {
  const hash = (s) => crypto.createHash('sha256').update(s).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
}

export function login(input) {
  const { password } = loginSchema.parse(input);
  const config = getConfig();

  if (!safeEqual(password, config.password)) {
    throw new AppError(401, 'Wrong password');
  }

  const token = jwt.sign({ role: 'shopkeeper' }, config.secret, { expiresIn: TOKEN_LIFETIME });  return { token, role: 'shopkeeper' };
}

// Check a token. Returns its contents, or throws 401 if it's missing, fake, edited or expired.
export function verifyToken(token) {
  if (!token) throw new AppError(401, 'Please log in as the shopkeeper');

  try {
    return jwt.verify(token, getConfig().secret);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new AppError(401, expired ? 'Your session has expired. Please log in again.' : 'Invalid login. Please log in again.');
  }
}
