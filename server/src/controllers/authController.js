// authController.js - thin controller for login.

import * as authService from '../services/authService.js';

// POST /api/auth/login   body: { password }
export function login(req, res) {
  res.json(authService.login(req.body));
}
