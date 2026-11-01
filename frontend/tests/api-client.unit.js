// Unit tests for src/api/client.js using Node's built-in test runner (no extra dependencies).
// fetch and sessionStorage are replaced with controllable fakes.
import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

let calls = [];
function mockFetch(responder) {
  calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return responder(url, opts);
  };
}
const jsonRes = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => "application/json; charset=utf-8" },
  json: async () => body,
});
const htmlRes = (status) => ({ ok: false, status, headers: { get: () => "text/html" }, json: async () => { throw new Error("not json"); } });

test.beforeEach(() => store.clear());

test("module loads outside Vite (import.meta.env undefined) and falls back to localhost API", async () => {
  const mod = await import("../src/api/client.js");
  mockFetch(() => jsonRes(200, { success: true }));
  await mod.api.getMe();
  assert.match(calls[0].url, /^http:\/\/localhost:5000\/api\/auth\/me$/);
});

test("token helpers store, read and clear the JWT", async () => {
  const { getToken, setToken, clearToken } = await import("../src/api/client.js");
  assert.equal(getToken(), null);
  setToken("abc");
  assert.equal(getToken(), "abc");
  clearToken();
  assert.equal(getToken(), null);
});

test("login sends JSON POST and never attaches an Authorization header", async () => {
  const { api, setToken } = await import("../src/api/client.js");
  setToken("stale-token");
  mockFetch(() => jsonRes(200, { success: true, data: { token: "t" } }));
  await api.login("a@b.co", "pw");
  const { url, opts } = calls[0];
  assert.ok(url.endsWith("/auth/login"));
  assert.equal(opts.method, "POST");
  assert.deepEqual(JSON.parse(opts.body), { email: "a@b.co", password: "pw" });
  assert.equal(opts.headers.Authorization, undefined);
});

test("authenticated calls attach the Bearer token", async () => {
  const { api, setToken } = await import("../src/api/client.js");
  setToken("tok123");
  mockFetch(() => jsonRes(200, { success: true, data: [] }));
  await api.getTasks();
  assert.equal(calls[0].opts.headers.Authorization, "Bearer tok123");
});

test("getTasks builds a query string only when params are given", async () => {
  const { api } = await import("../src/api/client.js");
  mockFetch(() => jsonRes(200, { data: [] }));
  await api.getTasks();
  await api.getTasks({ status: "done", search: "a b" });
  assert.ok(calls[0].url.endsWith("/tasks"));
  assert.ok(calls[1].url.endsWith("/tasks?status=done&search=a+b"));
});

test("create/update/delete use the right verbs and paths", async () => {
  const { api } = await import("../src/api/client.js");
  mockFetch(() => jsonRes(200, { data: {} }));
  await api.createTask({ title: "x" });
  await api.updateTask("42", { status: "done" });
  await api.deleteTask("42");
  assert.deepEqual(calls.map((c) => c.opts.method), ["POST", "PUT", "DELETE"]);
  assert.ok(calls[1].url.endsWith("/tasks/42"));
});

test("a 4xx response throws an Error carrying the server's message", async () => {
  const { api } = await import("../src/api/client.js");
  mockFetch(() => jsonRes(409, { success: false, message: "An account with this email already exists" }));
  await assert.rejects(api.signup("A", "a@b.co", "123456"), { message: "An account with this email already exists" });
});

test("a non-JSON error (e.g. proxy 502 page) gives a generic status message", async () => {
  const { api } = await import("../src/api/client.js");
  mockFetch(() => htmlRes(502));
  await assert.rejects(api.getTasks(), { message: "Request failed (502)" });
});

test("a network failure becomes a readable 'could not reach the server' error", async () => {
  const { api } = await import("../src/api/client.js");
  mockFetch(() => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(api.getTasks(), /Could not reach the server/);
});

test("a 401 on an authenticated call clears the token and notifies the app", async () => {
  const mod = await import("../src/api/client.js");
  mod.setToken("expired");
  let notified = false;
  mod.authEvents.addEventListener("unauthorized", () => (notified = true));
  mockFetch(() => jsonRes(401, { success: false, message: "Invalid or expired token" }));
  await assert.rejects(mod.api.getTasks());
  assert.equal(mod.getToken(), null, "expired token must be removed");
  assert.equal(notified, true, "app must be told to log the user out");
});

test("a 401 from LOGIN (wrong password) does not fire the logout event", async () => {
  const mod = await import("../src/api/client.js");
  let notified = false;
  mod.authEvents.addEventListener("unauthorized", () => (notified = true));
  mockFetch(() => jsonRes(401, { success: false, message: "Invalid email or password" }));
  await assert.rejects(mod.api.login("a@b.co", "bad"), { message: "Invalid email or password" });
  assert.equal(notified, false);
});

test("a deployed site built without VITE_API_URL fails with a clear message instead of calling localhost", async () => {
  const { api } = await import("../src/api/client.js");
  mockFetch(() => jsonRes(200, {}));
  globalThis.location = { hostname: "taskflow-web.onrender.com" };
  try {
    await assert.rejects(api.getTasks(), /VITE_API_URL was not set/);
    assert.equal(calls.length, 0, "no network request may be attempted");
  } finally {
    delete globalThis.location;
  }
});
