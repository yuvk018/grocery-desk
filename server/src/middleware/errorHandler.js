// errorHandler.js - the ONE place where errors are turned into HTTP responses.
//
// In Express 5, if an async route throws (or a promise rejects), Express passes
// the error here automatically. So controllers and services can simply "throw"
// and never need try/catch just to send an error response.

import mongoose from 'mongoose';
import { ZodError } from 'zod';
import AppError from '../utils/AppError.js';

// Runs when no route matched the URL.
export function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Express knows this is an error handler because it has 4 parameters (err, req, res, next).
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // 1. Errors we threw on purpose (e.g. "Product not found")
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // 2. Bad request body (Zod validation failed) -> list each field and what's wrong
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
    return res.status(400).json({ error: 'Invalid input', details });
  }

  // 3. Mongoose rejected the data (e.g. stock below 0)
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ error: 'Invalid input', details });
  }

  // 4. Unique field already taken (e.g. a second product with code "P01")
  if (err.code === 11000) {
    return res.status(409).json({ error: `Already exists: ${JSON.stringify(err.keyValue)}` });
  }

  // 5. Body sent by the client isn't valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  // 6. Anything else is a bug on our side. Log it with its stack (where it happened),
  //    but don't leak internals to the client.
  console.error(`Unexpected error on ${req.method} ${req.originalUrl}: ${err.message}`, err);
  return res.status(500).json({ error: 'Something went wrong on the server' });
}
