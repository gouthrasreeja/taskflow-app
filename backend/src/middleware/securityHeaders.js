// Dependency-free security headers for a JSON API (the `helmet` package is the usual choice;
// this covers the headers that matter here and is unit-testable without installing anything).
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  // This API only returns JSON, so nothing should ever be loaded or framed from its responses.
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  // Authenticated responses must not be stored by browsers or shared caches.
  res.setHeader("Cache-Control", "no-store");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
}
module.exports = securityHeaders;
