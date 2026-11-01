const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
process.env.LOG_LEVEL = "debug";
const requestLogger = require("../../src/middleware/requestLogger");

function simulate({ status, url = "/api/tasks?search=secret-term", user } = {}) {
  const lines = [];
  const origLog = console.log, origErr = console.error;
  console.log = (l) => lines.push(JSON.parse(l));
  console.error = (l) => lines.push(JSON.parse(l));
  try {
    const req = { method: "GET", originalUrl: url, ip: "9.9.9.9", user };
    const res = new EventEmitter();
    res.statusCode = status;
    const headers = {};
    res.setHeader = (k, v) => (headers[k] = v);
    requestLogger(req, res, () => {});
    res.emit("finish");
    return { line: lines[0], headers, req };
  } finally { console.log = origLog; console.error = origErr; }
}

test("assigns a request id, exposes it as X-Request-Id and logs one JSON line", () => {
  const { line, headers, req } = simulate({ status: 200 });
  assert.ok(req.id);
  assert.equal(headers["X-Request-Id"], req.id);
  assert.equal(line.id, req.id);
  assert.equal(line.status, 200);
  assert.equal(line.method, "GET");
  assert.equal(typeof line.ms, "number");
});
test("never writes the query string (search terms) to the log", () => {
  const { line } = simulate({ status: 200 });
  assert.equal(line.path, "/api/tasks");
  assert.ok(!JSON.stringify(line).includes("secret-term"));
});
test("level follows the status code: info / warn / error", () => {
  assert.equal(simulate({ status: 200 }).line.level, "info");
  assert.equal(simulate({ status: 404 }).line.level, "warn");
  assert.equal(simulate({ status: 500 }).line.level, "error");
});
test("includes the user id when the request was authenticated", () => {
  assert.equal(simulate({ status: 200, user: { _id: "u42" } }).line.userId, "u42");
});
