// Test helper: replaces third-party modules and Mongoose models with small fakes
// so controllers and middleware can be unit-tested in isolation (no database, no npm install).
const Module = require("module");
const path = require("path");

const fakes = {};
const originalLoad = Module._load;

function install(overrides = {}) {
  Object.assign(fakes, overrides);
  Module._load = function (request, parent, isMain) {
    if (fakes[request]) return fakes[request];
    // match models by their resolved file, e.g. ../models/Task
    if (parent && request.startsWith(".")) {
      const resolved = path.resolve(path.dirname(parent.filename), request);
      for (const key of Object.keys(fakes)) {
        if (key.startsWith("/") && resolved.endsWith(key)) return fakes[key];
      }
    }
    return originalLoad.apply(this, arguments);
  };
}
function uninstall() {
  Module._load = originalLoad;
  for (const k of Object.keys(fakes)) delete fakes[k];
}
// Remove cached copies of source files so each test file gets a fresh load
function purge(...parts) {
  for (const key of Object.keys(require.cache)) {
    if (parts.some((p) => key.includes(p))) delete require.cache[key];
  }
}

// Minimal Express-like helpers
function mockRes() {
  const res = { statusCode: 200, body: undefined, _done: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => { res.body = b; if (res._done) res._done({ err: undefined, res }); return res; };
  return res;
}

// Runs an Express handler/middleware and resolves when it either calls next(err?)
// or sends a JSON response, whichever happens first.
function run(handler, req) {
  const res = mockRes();
  return new Promise((resolve) => {
    res._done = resolve;
    handler(req, res, (err) => resolve({ err, res }));
  });
}

module.exports = { install, uninstall, purge, mockRes, run };
