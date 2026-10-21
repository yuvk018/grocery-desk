// helpers.js - small things several test files share.

import { login } from '../src/services/authService.js';

// Headers for a logged-in shopkeeper, e.g. request(app).put(url).set(shopkeeperAuth())
export function shopkeeperAuth() {
  return { Authorization: `Bearer ${login({ password: process.env.SHOPKEEPER_PASSWORD }).token}` };
}
