// AppError.js - an Error that also carries an HTTP status code.
//
// Services throw these when something is wrong in a way the user should know about,
// e.g. throw new AppError(404, 'Product not found').
// The error handler middleware then sends that status and message back as JSON.
// Services don't know about req/res; throwing an AppError is how they "answer" with an error.

export default class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status; // HTTP status code: 400 bad input, 404 not found, 409 conflict...
    this.details = details; // optional extra info, e.g. which fields failed validation
  }
}
