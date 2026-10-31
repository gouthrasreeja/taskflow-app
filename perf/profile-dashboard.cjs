// Profiles the dashboard with 500 tasks: search typing + filter switching under 4x CPU throttle.
// usage: BASE_URL=http://localhost:5173 API_URL=http://localhost:5000/api node perf/profile-dashboard.cjs "label" 7
const { chromium } = require("playwright");

const [, , LABEL = "run", RUNS = "7"] = process.argv;
const BASE = process.env.BASE_URL || "http://localhost:5173";
const API = process.env.API_URL || "http://localhost:5000/api";
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

(async () => {
  const api = API;
  const sr = await (await fetch(api + "/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Perf User", email: `perf${Date.now()}@example.com`, password: "password123" }) })).json();
  const token = sr.data.token;
  const statuses = ["pending", "in-progress", "done"];
  for (let i = 1; i <= 500; i++) {
    await fetch(api + "/tasks", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ title: `Task ${i}`, description: "seed", status: statuses[i % 3] }) });
  }

  const browser = await chromium.launch();
  const results = [];
  for (let run = 0; run < Number(RUNS); run++) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    await ctx.addInitScript((t) => sessionStorage.setItem("taskflow_token", t), token);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Performance.enable");
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(BASE + "/dashboard");
    await page.waitForFunction(() => document.querySelectorAll(".task-card").length === 500);
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      window.__m = { added: 0, removed: 0 };
      new MutationObserver((recs) => recs.forEach((r) => { const c = (n) => (n.nodeType === 1 ? 1 + n.querySelectorAll('*').length : 0); r.addedNodes.forEach((n) => (window.__m.added += c(n))); r.removedNodes.forEach((n) => (window.__m.removed += c(n))); }))
        .observe(document.body, { childList: true, subtree: true });
    });
    const get = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
    const m0 = await get();

    // Interaction: type a search, then switch filters back and forth
    await page.click(".search-input");
    await page.keyboard.type("task 4", { delay: 40 });
    await page.waitForFunction(() => document.querySelectorAll(".task-card").length === 111);
    await page.waitForTimeout(300);
    await page.fill(".search-input", "");
    await page.waitForFunction(() => document.querySelectorAll(".task-card").length === 500);
    for (const f of ["Done", "All", "Pending", "All"]) {
      await page.click(`.filter-btn >> text=${f}`);
      await page.waitForTimeout(600);
    }
    await page.waitForFunction(() => document.querySelectorAll(".task-card").length === 500);

    const m1 = await get();
    const dom = await page.evaluate(() => window.__m);
    results.push({
      scriptMs: (m1.ScriptDuration - m0.ScriptDuration) * 1000,
      layoutMs: (m1.LayoutDuration - m0.LayoutDuration) * 1000,
      styleMs: (m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000,
      taskMs: (m1.TaskDuration - m0.TaskDuration) * 1000,
      domAdded: dom.added, domRemoved: dom.removed,
    });
    await ctx.close();
  }
  const out = { label: LABEL, runs: results.length, tasks: 500, cpuThrottle: "4x" };
  for (const k of Object.keys(results[0])) out[k + "_median"] = Math.round(median(results.map((r) => r[k])) * 10) / 10;
  out.raw = results;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  process.exit(0);
})();
