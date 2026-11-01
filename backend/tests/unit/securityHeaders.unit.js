const test = require("node:test");
const assert = require("node:assert/strict");
const securityHeaders = require("../../src/middleware/securityHeaders");

function apply(nodeEnv) {
  const headers = {};
  const saved = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  let called = false;
  securityHeaders({}, { setHeader: (k, v) => (headers[k] = v) }, () => (called = true));
  process.env.NODE_ENV = saved;
  return { headers, called };
}

test("sets the baseline headers and calls next()", () => {
  const { headers, called } = apply("development");
  assert.equal(called, true);
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "no-referrer");
  assert.equal(headers["Cache-Control"], "no-store");
  assert.match(headers["Content-Security-Policy"], /default-src 'none'/);
});
test("HSTS is sent only in production", () => {
  assert.equal(apply("development").headers["Strict-Transport-Security"], undefined);
  assert.match(apply("production").headers["Strict-Transport-Security"], /max-age=\d+/);
});
