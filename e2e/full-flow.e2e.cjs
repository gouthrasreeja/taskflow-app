// End-to-end integration tests: a real browser drives the real UI, which calls the real API.
//   BASE_URL=http://localhost:5173 node e2e/full-flow.e2e.cjs      (needs: npm i -D playwright)
// Output is TAP-style so it can be saved as a log.
const { chromium } = require("playwright");

async function run(baseUrl, out = console.log) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  const email = `e2e${Date.now()}@example.com`;
  let n = 0, failed = 0;

  async function check(name, fn) {
    n++;
    try { await fn(); out(`ok ${n} - ${name}`); }
    catch (e) { failed++; out(`not ok ${n} - ${name}\n  # ${String(e.message).split("\n")[0]}`); }
  }
  const body = () => page.textContent("body");
  const cards = () => page.locator(".task-card").count();
  const must = (cond, msg) => { if (!cond) throw new Error(msg); };
  const settle = (ms = 700) => page.waitForTimeout(ms);

  await check("logged-out visit to /dashboard redirects to log in", async () => {
    await page.goto(baseUrl + "/dashboard"); await settle();
    must(page.url().endsWith("/login"), "url was " + page.url());
  });
  await check("wrong credentials show a readable error and keep the user on the form", async () => {
    await page.fill('input[type="email"]', "nobody@example.com");
    await page.fill('input[type="password"]', "wrongpass");
    await page.click('button[type="submit"]'); await settle();
    must((await body()).includes("Invalid email or password"), "no error message");
    must(page.url().endsWith("/login"), "left the login page");
  });
  await check("signup creates the account and lands on the dashboard", async () => {
    await page.click("text=Sign Up >> nth=-1"); await settle(300);
    await page.fill('input[type="text"]', "E2E User");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]'); await settle(1000);
    must(page.url().endsWith("/dashboard"), "not on dashboard: " + page.url());
  });
  await check("new account sees the empty state", async () => {
    must((await body()).includes("No tasks yet"), "empty state missing");
  });
  await check("creating three tasks through the modal adds them to the list", async () => {
    for (const t of ["Write report", "Fix bug (urgent)", "Plan [sprint]"]) {
      await page.click("text=+ New Task");
      await page.fill('.modal-card input[type="text"]', t);
      await page.click('.modal-card button[type="submit"]'); await settle(500);
    }
    must((await cards()) === 3, "expected 3 cards, got " + (await cards()));
  });
  await check("task detail edits persist (status change saved to the server)", async () => {
    await page.click("text=Write report"); await settle(500);
    await page.selectOption(".task-detail-card select", "done");
    await page.click("text=Save Changes"); await settle(600);
    must((await body()).includes("Saved to server"), "no save confirmation");
    await page.click("text=Back to Dashboard"); await settle(600);
  });
  await check("server-side status filter narrows the list", async () => {
    await page.click(".filter-btn >> text=Done"); await settle();
    must((await cards()) === 1, "got " + (await cards()));
    await page.click(".filter-btn >> text=All"); await settle();
    must((await cards()) === 3, "got " + (await cards()));
  });
  await check("search with regex characters '(' and '[' does not break the page", async () => {
    await page.fill(".search-input", "(urgent"); await settle(900);
    must(!(await page.locator('[role="alert"]').count()), "an error alert appeared");
    must((await cards()) === 1, "expected 1 match, got " + (await cards()));
    await page.fill(".search-input", "[sprint"); await settle(900);
    must(!(await page.locator('[role="alert"]').count()), "an error alert appeared");
    must((await cards()) === 1, "expected 1 match, got " + (await cards()));
    await page.fill(".search-input", ""); await settle(700);
  });
  await check("existing list stays visible (dimmed) while a refetch is in flight", async () => {
    await page.route("**/api/tasks?*", async (route) => { await new Promise((r) => setTimeout(r, 1200)); route.continue(); });
    await page.fill(".search-input", "report"); await settle(700); // debounce fired, response still pending
    must((await cards()) === 3, "list was blanked during refetch (cards=" + (await cards()) + ")");
    must(await page.locator('.task-list[aria-busy="true"]').count(), "list not marked busy");
    await settle(1500);
    must((await cards()) === 1, "filtered result not shown, cards=" + (await cards()));
    await page.unroute("**/api/tasks?*");
    await page.fill(".search-input", ""); await settle(900);
  });
  await check("deleting a task removes it", async () => {
    await page.click("text=Plan [sprint]"); await settle(500);
    await page.click("text=Delete"); await settle(800);
    must((await cards()) === 2, "got " + (await cards()));
  });
  await check("logout then login restores the server-side data", async () => {
    await page.click("text=Log Out"); await settle(500);
    await page.click("text=Log In >> nth=0"); await settle(400);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]'); await settle(1000);
    must((await cards()) === 2, "got " + (await cards()));
  });
  await check("page refresh keeps the session (token verified via /auth/me)", async () => {
    await page.reload(); await settle(1200);
    must(page.url().endsWith("/dashboard") && (await cards()) === 2, "session lost: " + page.url());
  });
  await check("unreachable API shows a readable error instead of a blank page", async () => {
    await page.route("**/api/tasks**", (route) => route.abort());
    await page.click(".filter-btn >> text=Pending"); await settle(900);
    must((await body()).includes("Could not reach the server"), "message missing");
    await page.unroute("**/api/tasks**");
    await page.click(".filter-btn >> text=All"); await settle(900);
  });
  await check("expired token mid-session logs the user out and redirects to login", async () => {
    await page.route("**/api/tasks**", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false, message: "Invalid or expired token" }) }));
    await page.click(".filter-btn >> text=Done"); await settle(1200);
    must(page.url().endsWith("/login"), "still on " + page.url());
    must((await page.evaluate(() => sessionStorage.getItem("taskflow_token"))) === null, "token not cleared");
    await page.unroute("**/api/tasks**");
  });

  out(`\n# tests ${n}\n# pass ${n - failed}\n# fail ${failed}`);
  await browser.close();
  return failed;
}
module.exports = { run };
if (require.main === module) run(process.env.BASE_URL || "http://localhost:5173").then((f) => process.exit(f ? 1 : 0));
