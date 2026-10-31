const test = require("node:test");
const assert = require("node:assert/strict");
const { install, uninstall, purge, run } = require("./helpers/stubModules");
const { makeTaskModel, makeUserModel, fakeJwt, fakeBcrypt } = require("./helpers/fakes");

process.env.JWT_SECRET = "unit-test-secret";
const tasks = [], users = [];
const Task = makeTaskModel(tasks), User = makeUserModel(users);
install({ jsonwebtoken: fakeJwt, bcryptjs: fakeBcrypt, "/models/Task": Task, "/models/User": User });
purge("src/controllers", "src/middleware/requireAuth");
const taskController = require("../../src/controllers/taskController");
const authController = require("../../src/controllers/authController");
const requireAuth = require("../../src/middleware/requireAuth");
test.after(uninstall);

const reset = () => { tasks.length = 0; users.length = 0; };
const seed = () => {
  reset();
  tasks.push(
    { _id: "a1", title: "Write report", status: "pending", userId: "u1" },
    { _id: "a2", title: "Fix bug (urgent)", status: "done", userId: "u1" },
    { _id: "b1", title: "Other user's task", status: "pending", userId: "u2" },
  );
};
const asUser = (id, extra = {}) => ({ user: { _id: id }, query: {}, params: {}, body: {}, ...extra });

// ---- tasks: ownership & behaviour ----
test("getTasks returns only the caller's tasks", async () => {
  seed();
  const { res } = await run(taskController.getTasks, asUser("u1"));
  assert.equal(res.body.count, 2);
  assert.ok(res.body.data.every((t) => t.userId === "u1"));
});
test("getTasks filters by status and search", async () => {
  seed();
  assert.equal((await run(taskController.getTasks, asUser("u1", { query: { status: "done" } }))).res.body.count, 1);
  assert.equal((await run(taskController.getTasks, asUser("u1", { query: { search: "REPORT" } }))).res.body.count, 1);
});
test("getTasks survives regex metacharacters in search", async () => {
  seed();
  const r = await run(taskController.getTasks, asUser("u1", { query: { search: "(urgent" } }));
  assert.equal(r.err, undefined, "search containing '(' must not crash the request");
  assert.equal(r.res.body.count, 1);
});
test("getTasks rejects operator objects in ?status[$ne]=", async () => {
  seed();
  const r = await run(taskController.getTasks, asUser("u1", { query: { status: { $ne: "done" } } }));
  assert.equal(r.err && r.err.statusCode, 400);
});
test("getTaskById cannot read another user's task (404)", async () => {
  seed();
  const r = await run(taskController.getTaskById, asUser("u1", { params: { id: "b1" } }));
  assert.equal(r.err.statusCode, 404);
});
test("createTask uses the authenticated user and ignores a userId in the body", async () => {
  seed();
  const r = await run(taskController.createTask, asUser("u1", { body: { title: "New", userId: "u2" } }));
  assert.equal(r.res.statusCode, 201);
  assert.equal(r.res.body.data.userId, "u1");
});
test("updateTask changes only provided fields", async () => {
  seed();
  const r = await run(taskController.updateTask, asUser("u1", { params: { id: "a1" }, body: { status: "done" } }));
  assert.equal(r.res.body.data.status, "done");
  assert.equal(r.res.body.data.title, "Write report");
});
test("updateTask / deleteTask on another user's task return 404", async () => {
  seed();
  assert.equal((await run(taskController.updateTask, asUser("u1", { params: { id: "b1" }, body: { status: "done" } }))).err.statusCode, 404);
  assert.equal((await run(taskController.deleteTask, asUser("u1", { params: { id: "b1" } }))).err.statusCode, 404);
  assert.equal(tasks.length, 3, "nothing was deleted");
});
test("deleteTask removes the caller's own task", async () => {
  seed();
  const r = await run(taskController.deleteTask, asUser("u1", { params: { id: "a1" } }));
  assert.equal(r.res.body.success, true);
  assert.equal(tasks.length, 2);
});

// ---- auth ----
test("signup creates a user and returns a token", async () => {
  reset();
  const r = await run(authController.signup, { body: { name: "Ada", email: "Ada@X.io", password: "secret1" } });
  assert.equal(r.res.statusCode, 201);
  assert.ok(r.res.body.data.token);
  assert.equal(users[0].email, "ada@x.io");
});
test("signup with an existing email returns 409", async () => {
  reset();
  await run(authController.signup, { body: { name: "Ada", email: "ada@x.io", password: "secret1" } });
  const r = await run(authController.signup, { body: { name: "Ada2", email: "ADA@x.io", password: "secret2" } });
  assert.equal(r.err.statusCode, 409);
});
test("login succeeds with the right password and fails with a wrong one", async () => {
  reset();
  await run(authController.signup, { body: { name: "Ada", email: "ada@x.io", password: "secret1" } });
  assert.ok((await run(authController.login, { body: { email: "ada@x.io", password: "secret1" } })).res.body.data.token);
  assert.equal((await run(authController.login, { body: { email: "ada@x.io", password: "wrong" } })).err.statusCode, 401);
  assert.equal((await run(authController.login, { body: { email: "nobody@x.io", password: "x" } })).err.statusCode, 401);
});

// ---- requireAuth ----
test("requireAuth rejects missing, malformed and invalid tokens", async () => {
  reset();
  assert.equal((await run(requireAuth, { headers: {} })).err.statusCode, 401);
  assert.equal((await run(requireAuth, { headers: { authorization: "Token abc" } })).err.statusCode, 401);
  assert.equal((await run(requireAuth, { headers: { authorization: "Bearer garbage" } })).err.statusCode, 401);
});
test("requireAuth rejects a valid token whose user was deleted", async () => {
  reset();
  const token = fakeJwt.sign({ sub: "ghost" });
  assert.equal((await run(requireAuth, { headers: { authorization: `Bearer ${token}` } })).err.statusCode, 401);
});
test("requireAuth attaches the user for a valid token", async () => {
  reset();
  users.push({ _id: "u1", name: "Ada" });
  const req = { headers: { authorization: `Bearer ${fakeJwt.sign({ sub: "u1" })}` } };
  const r = await run(requireAuth, req);
  assert.equal(r.err, undefined);
  assert.equal(req.user._id, "u1");
});
