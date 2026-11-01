const crypto = require("crypto");
const logger = require("../utils/logger");

// Gives every request an id (returned as X-Request-Id so a user's error report can be matched to a
// log line) and writes one structured access-log line when the response finishes.
function requestLogger(req, res, next) {
  const id = crypto.randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    // Log the path only (no query string) so search terms and similar data are not written to logs.
    logger[level]("request", {
      id,
      method: req.method,
      path: (req.originalUrl || req.url || "").split("?")[0],
      status: res.statusCode,
      ms: Math.round(ms * 10) / 10,
      ip: req.ip,
      userId: req.user ? String(req.user._id) : undefined,
    });
  });
  next();
}
module.exports = requestLogger;
