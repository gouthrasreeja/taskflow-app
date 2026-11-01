const test = require("node:test");
const assert = require("node:assert/strict");
const createRateLimiter = require("../../src/middleware/rateLimiter");

function hit(limiter, ip) {
  const headers = {};
  let err;
  limiter({ ip }, { setHeader: (k, v) => (headers[k] = v) }, (e) => (err = e));
  return { err, headers };
}

test("allows requests up to the limit, then answers 429 with Retry-After", () => {
  let t = 1_000_000;
  const l = createRateLimiter({ windowMs: 60_000, max: 3, now: () => t });
  for (let i = 0; i < 3; i++) assert.equal(hit(l, "1.1.1.1").err, undefined);
  const blocked = hit(l, "1.1.1.1");
  assert.equal(blocked.err.statusCode, 429);
  assert.equal(blocked.headers["Retry-After"], "60");
  l.stop();
});
test("reports remaining attempts in headers", () => {
  const l = createRateLimiter({ windowMs: 60_000, max: 5, now: () => 0 });
  assert.equal(hit(l, "a").headers["RateLimit-Remaining"], "4");
  assert.equal(hit(l, "a").headers["RateLimit-Remaining"], "3");
  l.stop();
});
test("clients are counted separately", () => {
  const l = createRateLimiter({ windowMs: 60_000, max: 1, now: () => 0 });
  assert.equal(hit(l, "a").err, undefined);
  assert.equal(hit(l, "b").err, undefined);
  assert.equal(hit(l, "a").err.statusCode, 429);
  l.stop();
});
test("the window resets after windowMs", () => {
  let t = 0;
  const l = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
  assert.equal(hit(l, "a").err, undefined);
  assert.equal(hit(l, "a").err.statusCode, 429);
  t = 1001;
  assert.equal(hit(l, "a").err, undefined);
  l.stop();
});
