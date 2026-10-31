// DEMO-ONLY: same REST contract as backend/, using only Node built-ins and an
// in-memory store. Used solely to run and screen-record the integration in a
// sandbox with no npm registry access. The submitted back-end is backend/.
const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");
const SECRET = "demo_only_secret";
const users = [], tasks = [];
let uid = 1, tid = 1;

const hash = (pw, salt = crypto.randomBytes(16).toString("hex")) => `${salt}:${crypto.scryptSync(pw, salt, 64).toString("hex")}`;
const verify = (pw, st) => { const [s, h] = st.split(":"); return crypto.scryptSync(pw, s, 64).toString("hex") === h; };
const b64 = (x) => Buffer.from(x).toString("base64url");
const sign = (p) => { const h = b64(JSON.stringify({ alg: "HS256", typ: "JWT" })), b = b64(JSON.stringify(p));
  return `${h}.${b}.${crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url")}`; };
const check = (t) => { const [h, b, s] = t.split(".");
  if (crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url") !== s) throw 0;
  return JSON.parse(Buffer.from(b, "base64url")); };
const send = (res, code, data) => { res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" });
  res.end(JSON.stringify(data)); };
const pubU = (u) => ({ _id: String(u.id), name: u.name, email: u.email });
const pubT = (t) => ({ _id: String(t.id), title: t.title, description: t.description, status: t.status, dueDate: t.dueDate, userId: String(t.userId), createdAt: t.createdAt, updatedAt: t.updatedAt });
const authUser = (req) => { const [s, t] = (req.headers.authorization || "").split(" ");
  if (s !== "Bearer" || !t) return null; try { return users.find((u) => u.id === check(t).sub) || null; } catch { return null; } };
const fail = (res, c, m) => send(res, c, { success: false, message: m });

http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 200, {});
  const url = new URL(req.url, "http://x"), p = url.pathname;
  let raw = ""; req.on("data", (c) => (raw += c));
  req.on("end", () => {
    let b = {}; try { b = raw ? JSON.parse(raw) : {}; } catch {}
    if (p === "/api/health") return send(res, 200, { success: true });
    if (p === "/api/auth/signup" && req.method === "POST") {
      if (!b.name || b.name.trim().length < 2) return fail(res, 400, "Name must be at least 2 characters");
      if (!b.email || !/^\S+@\S+\.\S+$/.test(b.email)) return fail(res, 400, "A valid email is required");
      if (!b.password || b.password.length < 6) return fail(res, 400, "Password must be at least 6 characters");
      if (users.find((u) => u.email === b.email.toLowerCase())) return fail(res, 409, "An account with this email already exists");
      const u = { id: uid++, name: b.name, email: b.email.toLowerCase(), passwordHash: hash(b.password) }; users.push(u);
      return send(res, 201, { success: true, data: { user: pubU(u), token: sign({ sub: u.id }) } });
    }
    if (p === "/api/auth/login" && req.method === "POST") {
      const u = users.find((x) => x.email === (b.email || "").toLowerCase());
      if (!u || !verify(b.password || "", u.passwordHash)) return fail(res, 401, "Invalid email or password");
      return send(res, 200, { success: true, data: { user: pubU(u), token: sign({ sub: u.id }) } });
    }
    if (p === "/api/auth/me") { const u = authUser(req); return u ? send(res, 200, { success: true, data: { user: pubU(u) } }) : fail(res, 401, "Invalid or expired token"); }
    if (p.startsWith("/api/tasks")) {
      const u = authUser(req); if (!u) return fail(res, 401, "Missing or malformed Authorization header");
      const m = p.match(/^\/api\/tasks\/(\w+)$/);
      if (p === "/api/tasks" && req.method === "GET") {
        let l = tasks.filter((t) => t.userId === u.id);
        const st = url.searchParams.get("status"), q = url.searchParams.get("search");
        if (st) l = l.filter((t) => t.status === st);
        if (q) l = l.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
        l = [...l].sort((a, c) => (a.createdAt < c.createdAt ? 1 : -1));
        return send(res, 200, { success: true, count: l.length, data: l.map(pubT) });
      }
      if (p === "/api/tasks" && req.method === "POST") {
        if (!b.title || !b.title.trim()) return fail(res, 400, "Title cannot be empty");
        const now = new Date().toISOString();
        const t = { id: tid++, title: b.title, description: b.description || "", status: b.status || "pending", dueDate: b.dueDate || null, userId: u.id, createdAt: now, updatedAt: now };
        tasks.push(t); return send(res, 201, { success: true, data: pubT(t) });
      }
      if (m) {
        const i = tasks.findIndex((t) => t.id === Number(m[1]) && t.userId === u.id), t = tasks[i];
        if (!t) return fail(res, 404, "Task not found");
        if (req.method === "GET") return send(res, 200, { success: true, data: pubT(t) });
        if (req.method === "PUT") { for (const k of ["title", "description", "status", "dueDate"]) if (b[k] !== undefined) t[k] = b[k];
          t.updatedAt = new Date().toISOString(); return send(res, 200, { success: true, data: pubT(t) }); }
        if (req.method === "DELETE") { tasks.splice(i, 1); return send(res, 200, { success: true, data: {} }); }
      }
    }
    fail(res, 404, `Route not found: ${req.method} ${p}`);
  });
}).listen(5000, () => console.log("demo API on :5000"));
