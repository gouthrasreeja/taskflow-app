const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

// 404 handler - runs when no route matched
function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler - must be registered last, after all routes.
// Express recognizes it as an error handler because it takes 4 arguments.
function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Mongoose validation errors -> 400 with field-level details
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  // Mongoose duplicate key error (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `${field} already in use`;
  }

  // Malformed ObjectId passed in a URL param
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Unexpected errors (database outages, bugs) must not leak internals to the client.
  // Mapped Mongoose errors above set a 4xx/409 status, so only true 500s are masked here.
  const unexpected = statusCode >= 500 && !err.isOperational;
  if (unexpected) {
    // keep full detail in the server log only, tagged with the request id
    logger.error("unhandled_error", { requestId: req && req.id, name: err.name, message: err.message, stack: err.stack });
    message = "Internal server error";
  }

  const body = { success: false, message };
  // For 5xx, give the user an id they can quote; it matches the X-Request-Id log line.
  if (unexpected && req && req.id) body.requestId = req.id;
  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
