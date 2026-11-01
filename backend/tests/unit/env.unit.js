const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEnv, parseOrigins } = require("../../src/config/env");

const goodProd = {
  NODE_ENV: "production",
  MONGO_URI: "mongodb+srv://u:p@cluster0.mongodb.net/taskflow",
  JWT_SECRET: "x".repeat(48) + "Q7!",
  CLIENT_ORIGIN: "https://taskflow-web.onrender.com",
};

test("parseOrigins trims spaces, drops trailing slashes and empty entries", () => {
  assert.deepEqual(parseOrigins(" https://a.com/ , https://b.com,, "), ["https://a.com", "https://b.com"]);
  assert.deepEqual(parseOrigins(undefined), []);
});
test("a complete production config is accepted", () => {
  const r = validateEnv(goodProd);
  assert.equal(r.ok, true, r.errors.join("; "));
  assert.deepEqual(r.origins, ["https://taskflow-web.onrender.com"]);
});
test("missing MONGO_URI and JWT_SECRET are both reported at once", () => {
  const r = validateEnv({ NODE_ENV: "development" });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
});
test("production rejects a short JWT secret", () => {
  const r = validateEnv({ ...goodProd, JWT_SECRET: "short-secret" });
  assert.ok(r.errors.some((e) => /32 characters/.test(e)));
});
test("production requires CLIENT_ORIGIN and rejects the wildcard", () => {
  assert.ok(validateEnv({ ...goodProd, CLIENT_ORIGIN: "" }).errors.some((e) => /CLIENT_ORIGIN is required/.test(e)));
  assert.ok(validateEnv({ ...goodProd, CLIENT_ORIGIN: "*" }).errors.some((e) => /must not be/.test(e)));
});
test("the .env.example placeholder secret is flagged (warning in dev, error in prod)", () => {
  const dev = validateEnv({ NODE_ENV: "development", MONGO_URI: "mongodb://x", JWT_SECRET: "replace_this_with_a_long_random_secret" });
  assert.equal(dev.ok, true);
  assert.equal(dev.warnings.length, 1);
  const prod = validateEnv({ ...goodProd, JWT_SECRET: "replace_this_with_a_long_random_secret_value_123" });
  assert.equal(prod.ok, false);
});
test("a non-https production origin produces a warning", () => {
  const r = validateEnv({ ...goodProd, CLIENT_ORIGIN: "http://example.com" });
  assert.ok(r.warnings.some((w) => /not https/.test(w)));
});
test("an invalid PORT is rejected", () => {
  assert.equal(validateEnv({ ...goodProd, PORT: "abc" }).ok, false);
  assert.equal(validateEnv({ ...goodProd, PORT: "10000" }).ok, true);
});
