const test = require("node:test");
const assert = require("node:assert/strict");
const { run } = require("./helpers/stubModules");
const { validateSignup, validateLogin, validateTaskInput } = require("../../src/middleware/validate");

const status = (r) => r.err && r.err.statusCode;
const ok = (r) => r.err === undefined;

test("validateSignup accepts a valid payload", async () => {
  assert.ok(ok(await run(validateSignup, { body: { name: "Ada", email: "ada@x.io", password: "secret1" } })));
});
test("validateSignup rejects short name, bad email, short password", async () => {
  assert.equal(status(await run(validateSignup, { body: { name: "A", email: "ada@x.io", password: "secret1" } })), 400);
  assert.equal(status(await run(validateSignup, { body: { name: "Ada", email: "nope", password: "secret1" } })), 400);
  assert.equal(status(await run(validateSignup, { body: { name: "Ada", email: "ada@x.io", password: "123" } })), 400);
});
test("validateSignup rejects non-string email (array) instead of crashing later", async () => {
  const r = await run(validateSignup, { body: { name: "Ada", email: ["ada@x.io"], password: "secret1" } });
  assert.equal(status(r), 400);
});
test("validateLogin requires both fields", async () => {
  assert.equal(status(await run(validateLogin, { body: { email: "a@b.co" } })), 400);
  assert.ok(ok(await run(validateLogin, { body: { email: "a@b.co", password: "x" } })));
});
test("validateLogin rejects object values (NoSQL operator injection attempt)", async () => {
  const r = await run(validateLogin, { body: { email: { $gt: "" }, password: "x" } });
  assert.equal(status(r), 400);
});
test("validateTaskInput allows partial updates and valid values", async () => {
  assert.ok(ok(await run(validateTaskInput, { body: {} })));
  assert.ok(ok(await run(validateTaskInput, { body: { title: "T", status: "done", dueDate: "2026-12-01" } })));
  assert.ok(ok(await run(validateTaskInput, { body: { dueDate: null } })));
});
test("validateTaskInput rejects blank title, bad status, bad date", async () => {
  assert.equal(status(await run(validateTaskInput, { body: { title: "   " } })), 400);
  assert.equal(status(await run(validateTaskInput, { body: { status: "finished" } })), 400);
  assert.equal(status(await run(validateTaskInput, { body: { dueDate: "not-a-date" } })), 400);
});
test("validateTaskInput rejects non-string description", async () => {
  assert.equal(status(await run(validateTaskInput, { body: { title: "T", description: { a: 1 } } })), 400);
});
test("validateTaskInput rejects a numeric dueDate", async () => {
  assert.equal(status(await run(validateTaskInput, { body: { dueDate: 12345 } })), 400);
});
