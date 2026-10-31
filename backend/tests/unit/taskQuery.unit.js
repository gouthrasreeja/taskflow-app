const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTaskFilter } = require("../../src/utils/taskQuery");
const escapeRegex = require("../../src/utils/escapeRegex");

test("filter always includes the owner id", () => {
  assert.deepEqual(buildTaskFilter({}, "u1"), { userId: "u1" });
});
test("valid status and search are applied", () => {
  const f = buildTaskFilter({ status: "done", search: "report" }, "u1");
  assert.equal(f.status, "done");
  assert.ok(f.title.$regex);
});
test("unknown status is rejected with 400", () => {
  assert.throws(() => buildTaskFilter({ status: "bogus" }, "u1"), (e) => e.statusCode === 400);
});
test("operator injection via ?status[$ne]=x is rejected", () => {
  assert.throws(() => buildTaskFilter({ status: { $ne: "done" } }, "u1"), (e) => e.statusCode === 400);
});
test("non-string search (array/object) is rejected", () => {
  assert.throws(() => buildTaskFilter({ search: ["a", "b"] }, "u1"), (e) => e.statusCode === 400);
  assert.throws(() => buildTaskFilter({ search: { $ne: "" } }, "u1"), (e) => e.statusCode === 400);
});
test("regex metacharacters in search are escaped so they match literally", () => {
  const f = buildTaskFilter({ search: "(a+)+$" }, "u1");
  const re = new RegExp(f.title.$regex, f.title.$options);
  assert.ok(re.test("fix (a+)+$ bug"));      // literal text matches
  assert.ok(!re.test("aaaa"));                // not interpreted as a pattern
  assert.equal(escapeRegex("a.b*c"), "a\\.b\\*c");
});
test("an unbalanced bracket in search no longer produces an invalid regex", () => {
  const f = buildTaskFilter({ search: "[todo" }, "u1");
  assert.doesNotThrow(() => new RegExp(f.title.$regex, f.title.$options));
});
test("very long search strings are rejected", () => {
  assert.throws(() => buildTaskFilter({ search: "a".repeat(500) }, "u1"), (e) => e.statusCode === 400);
});
