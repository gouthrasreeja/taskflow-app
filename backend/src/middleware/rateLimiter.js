const ApiError = require("../utils/ApiError");

// Fixed-window, in-memory limiter keyed by client IP. Used on /api/auth/* to slow password guessing.
// Limits: per instance and reset on restart; fine for a single small server. For several instances,
// move the counters to a shared store (e.g. Redis).
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 20, now = Date.now } = {}) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Periodic cleanup so the map cannot grow without bound
  const sweep = setInterval(() => {
    const t = now();
    for (const [ip, h] of hits) if (h.resetAt <= t) hits.delete(ip);
  }, windowMs);
  if (sweep.unref) sweep.unref(); // never keep the process alive just for cleanup

  function limiter(req, res, next) {
    const t = now();
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
    let h = hits.get(ip);
    if (!h || h.resetAt <= t) {
      h = { count: 0, resetAt: t + windowMs };
      hits.set(ip, h);
    }
    h.count += 1;

    const remaining = Math.max(0, max - h.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));

    if (h.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((h.resetAt - t) / 1000)));
      return next(new ApiError(429, "Too many attempts. Please wait a few minutes and try again."));
    }
    next();
  }
  limiter.size = () => hits.size;
  limiter.stop = () => clearInterval(sweep);
  return limiter;
}

module.exports = createRateLimiter;
