// requireShopkeeper.js - a "guard" placed in front of shopkeeper-only routes.
//
// Middleware runs BEFORE the controller. This one reads the token from the
// "Authorization: Bearer <token>" header and checks it:
//   - valid shopkeeper token -> call next(), the request continues to the controller
//   - missing / fake / expired -> verifyToken throws a 401, which goes to the error handler,
//     and the controller never runs
//
// Usage in a route file:  router.put('/:id', requireShopkeeper, productController.updateProduct);

import AppError from '../utils/AppError.js';
import { verifyToken } from '../services/authService.js';

export default function requireShopkeeper(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;

  const payload = verifyToken(token);
  if (payload.role !== 'shopkeeper') throw new AppError(403, 'Shopkeeper only');

  req.user = payload; // available to later code if needed
  next();
}
