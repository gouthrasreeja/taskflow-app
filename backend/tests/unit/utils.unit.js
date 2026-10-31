const test = require("node:test");
const assert = require("node:assert/strict");
const asyncHandler = require("../../src/utils/asyncHandler");
const ApiError = require("../../src/utils/ApiError");

test("asyncHandler forwards rejected promises to next()", async () => {
  const boom = new Error("boom");
  const wrapped = asyncHandler(async () => { throw boom; });
  const err = await new Promise((resolve) => wrapped({}, {}, resolve));
  assert.equal(err, boom);
});
test("asyncHandler does not call next() on success", async () => {
  let called = false;
  await asyncHandler(async () => {})({}, {}, () => (called = true));
  await new Promise((r) => setImmediate(r));
  assert.equal(called, false);
});
test("ApiError is an Error flagged as operational", () => {
  const e = new ApiError(418, "teapot");
  assert.ok(e instanceof Error);
  assert.equal(e.statusCode, 418);
  assert.equal(e.isOperational, true);
});
