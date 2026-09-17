// Used for expected failures (bad input, not found, unauthorized) so the
// error handler can trust `statusCode` instead of always returning 500.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

module.exports = ApiError;
