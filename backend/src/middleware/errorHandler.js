const ApiError = require("../utils/ApiError");

// 404 handler - runs when no route matched
function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler - must be registered last, after all routes.
// Express recognizes it as an error handler because it takes 4 arguments.
function errorHandler(err, _req, res, _next) {
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
    console.error(err); // keep full detail in the server log only
    message = "Internal server error";
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = { notFound, errorHandler };
