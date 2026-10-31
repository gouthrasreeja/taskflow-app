const test = require("node:test");
const assert = require("node:assert/strict");
const { mockRes } = require("./helpers/stubModules");
const { notFound, errorHandler } = require("../../src/middleware/errorHandler");
const ApiError = require("../../src/utils/ApiError");

const handle = (err) => { const res = mockRes(); errorHandler(err, {}, res, () => {}); return res; };
process.env.NODE_ENV = "production"; // keep test output quiet

test("ApiError keeps its status code and message", () => {
  const res = handle(new ApiError(404, "Task not found"));
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { success: false, message: "Task not found" });
});
test("notFound forwards a 404 ApiError naming the route", () => {
  let got; notFound({ method: "GET", originalUrl: "/nope" }, {}, (e) => (got = e));
  assert.equal(got.statusCode, 404);
  assert.match(got.message, /GET \/nope/);
});
test("Mongoose ValidationError becomes 400 with joined messages", () => {
  const err = Object.assign(new Error("x"), { name: "ValidationError", errors: { a: { message: "A bad" }, b: { message: "B bad" } } });
  const res = handle(err);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "A bad, B bad");
});
test("duplicate key error becomes 409 naming the field", () => {
  const res = handle(Object.assign(new Error("dup"), { code: 11000, keyValue: { email: "a@b.co" } }));
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, "email already in use");
});
test("CastError (bad ObjectId) becomes 400", () => {
  const res = handle(Object.assign(new Error("cast"), { name: "CastError", path: "_id", value: "zzz" }));
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Invalid _id/);
});
test("unexpected errors return 500 WITHOUT leaking internal details", () => {
  const res = handle(new Error("connect ECONNREFUSED 10.0.0.5:27017 user=admin"));
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Internal server error");
});
