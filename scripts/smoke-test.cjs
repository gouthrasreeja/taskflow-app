// Post-deployment smoke / user-acceptance test. Needs only Node 22+ (no npm install).
//   API_URL=https://taskflow-api.onrender.com/api FRONTEND_URL=https://taskflow-web.onrender.com node scripts/smoke-test.cjs
// Optional: RATE_LIMIT_TEST=1 (sends ~25 bad logins to prove the limiter), SKIP_HARDENING=1 (functional checks only).
const API = (process.env.API_URL || "").replace(/\/+$/, "");
const WEB = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
if (!API) { console.error("Set API_URL, e.g. https://taskflow-api.onrender.com/api"); process.exit(2); }
const HARDEN = !process.env.SKIP_HARDENING;
let n = 0, failed = 0;
const J = { "Content-Type": "application/json" };

async function call(path, { method = "GET", body, token, headers = {}, raw = false, base = API, timeout = 90000 } = {}) {
  const t0 = Date.now();
  const res = await fetch(base + path, {
    method, signal: AbortSignal.timeout(timeout),
    headers: { ...(raw ? {} : J), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, json, text, ms: Date.now() - t0 };
}
async function check(name, fn) {
  n++;
  try { await fn(); console.log(`ok ${n} - ${name}`); }
  catch (e) { failed++; console.log(`not ok ${n} - ${name}\n  # ${e.message}`); }
}
const must = (c, m) => { if (!c) throw new Error(m); };

(async () => {
  const stamp = Date.now();
  const a = { name: "Smoke A", email: `smoke.a.${stamp}@example.com`, password: "SmokeTest#123" };
  const b = { name: "Smoke B", email: `smoke.b.${stamp}@example.com`, password: "SmokeTest#123" };
  let tokenA, tokenB, taskId;

  await check("API is reachable (first request may take ~1 min if the free host was asleep)", async () => {
    const r = await call("/health");
    console.log(`  # health responded in ${r.ms} ms`);
    must(r.status === 200, `status ${r.status}: ${r.text.slice(0, 120)}`);
    if (HARDEN) must(r.json && r.json.db === "connected", "health does not report db: connected");
  });
  await check("unknown route returns a JSON 404", async () => {
    const r = await call("/nope"); must(r.status === 404 && r.json && r.json.success === false, `status ${r.status}`);
  });
  await check("signup creates an account and returns a token", async () => {
    const r = await call("/auth/signup", { method: "POST", body: a });
    must(r.status === 201 && r.json.data.token, `status ${r.status}: ${r.text.slice(0, 120)}`);
    must(!JSON.stringify(r.json).includes("passwordHash") && !JSON.stringify(r.json).includes(a.password), "password data leaked in response");
    tokenA = r.json.data.token;
  });
  await check("duplicate signup is rejected with 409", async () => {
    const r = await call("/auth/signup", { method: "POST", body: a }); must(r.status === 409, `status ${r.status}`);
  });
  await check("signup validation rejects a short password with 400", async () => {
    const r = await call("/auth/signup", { method: "POST", body: { ...b, password: "123" } }); must(r.status === 400, `status ${r.status}`);
  });
  await check("login with a wrong password returns 401", async () => {
    const r = await call("/auth/login", { method: "POST", body: { email: a.email, password: "wrong-password" } }); must(r.status === 401, `status ${r.status}`);
  });
  await check("login with the right password returns a token", async () => {
    const r = await call("/auth/login", { method: "POST", body: { email: a.email, password: a.password } });
    must(r.status === 200 && r.json.data.token, `status ${r.status}`); tokenA = r.json.data.token;
  });
  await check("task routes require a token (401 without one)", async () => {
    const r = await call("/tasks"); must(r.status === 401, `status ${r.status}`);
  });
  await check("create, read, update and delete a task", async () => {
    let r = await call("/tasks", { method: "POST", token: tokenA, body: { title: "Smoke task", description: "created by smoke test" } });
    must(r.status === 201, `create ${r.status}`); taskId = r.json.data._id;
    r = await call(`/tasks/${taskId}`, { token: tokenA }); must(r.status === 200 && r.json.data.title === "Smoke task", `read ${r.status}`);
    r = await call(`/tasks/${taskId}`, { method: "PUT", token: tokenA, body: { status: "done" } }); must(r.status === 200 && r.json.data.status === "done", `update ${r.status}`);
    r = await call("/tasks?status=done", { token: tokenA }); must(r.status === 200 && r.json.count >= 1, `filter ${r.status}`);
  });
  await check("a second user cannot read, change or delete the first user's task (404)", async () => {
    let r = await call("/auth/signup", { method: "POST", body: b }); tokenB = r.json.data.token;
    for (const [m, body] of [["GET"], ["PUT", { status: "pending" }], ["DELETE"]]) {
      r = await call(`/tasks/${taskId}`, { method: m, token: tokenB, body }); must(r.status === 404, `${m} returned ${r.status}`);
    }
    r = await call("/tasks", { token: tokenB }); must(r.json.count === 0, "user B can see user A's tasks");
  });
  if (HARDEN) {
    await check("operator injection (?status[$ne]=done) is rejected with 400", async () => {
      const r = await call("/tasks?status[$ne]=done", { token: tokenA }); must(r.status === 400, `status ${r.status}`);
    });
    await check("search text with regex characters does not cause a server error", async () => {
      const r = await call("/tasks?search=%28urgent%5B", { token: tokenA }); must(r.status === 200, `status ${r.status}`);
    });
    await check("malformed JSON gives 400 and no stack trace", async () => {
      const r = await call("/auth/login", { method: "POST", raw: true, body: "{bad", headers: J });
      must(r.status === 400 && !/node_modules|\n\s+at /.test(r.text), `status ${r.status}: ${r.text.slice(0, 100)}`);
    });
    await check("security headers are present and the framework is not advertised", async () => {
      const r = await call("/health"); const h = r.headers;
      must(h.get("x-content-type-options") === "nosniff", "missing X-Content-Type-Options");
      must(h.get("x-frame-options") === "DENY", "missing X-Frame-Options");
      must(!h.get("x-powered-by"), "X-Powered-By is exposed");
      must(h.get("x-request-id"), "missing X-Request-Id");
      if (API.startsWith("https://")) must(h.get("strict-transport-security"), "missing HSTS over https");
    });
    if (WEB) {
      await check("CORS allows the real front-end origin", async () => {
        const r = await call("/health", { headers: { Origin: WEB } });
        must(r.headers.get("access-control-allow-origin") === WEB, `got '${r.headers.get("access-control-allow-origin")}'`);
      });
      await check("CORS does NOT allow an unknown origin", async () => {
        const r = await call("/health", { headers: { Origin: "https://evil.example" } });
        must(!r.headers.get("access-control-allow-origin"), "evil origin was allowed");
      });
    }
    if (process.env.RATE_LIMIT_TEST) {
      await check("repeated bad logins are rate-limited (429)", async () => {
        let hit = 0;
        for (let i = 0; i < 30 && !hit; i++) { const r = await call("/auth/login", { method: "POST", body: { email: a.email, password: "bad" + i } }); if (r.status === 429) hit = i + 1; }
        must(hit, "no 429 after 30 attempts");
        console.log(`  # limiter engaged after ${hit} attempts`);
      });
    }
  }
  await check("cleanup: delete the smoke-test task", async () => {
    const r = await call(`/tasks/${taskId}`, { method: "DELETE", token: tokenA }); must(r.status === 200, `status ${r.status}`);
  });
  if (WEB) {
    await check("front-end home page is served", async () => {
      const r = await call("/", { base: WEB, raw: true }); must(r.status === 200 && /id="root"/.test(r.text), `status ${r.status}`);
    });
    await check("deep link /dashboard also serves the app (SPA rewrite configured)", async () => {
      const r = await call("/dashboard", { base: WEB, raw: true }); must(r.status === 200 && /id="root"/.test(r.text), `status ${r.status}`);
    });
  }
  console.log(`\n# tests ${n}\n# pass ${n - failed}\n# fail ${failed}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("smoke test aborted:", e.message); process.exit(2); });
