# TaskFlow — Debugging Report & Lessons Learned (Week 5)

## Method
1. **Write tests first, run them against the existing code.** Failures are saved in `logs/*-BEFORE-fixes.log`.
2. **Triage each failure**: is the code wrong, or is the test (or its fake) wrong?
3. **Fix the cause**, not the symptom, then re-run to produce `logs/*-AFTER-fixes.log`.
4. **Keep the test** as a regression guard.

Triage mattered: of the 8 first-run backend failures, **7 were real bugs and 1 was my test's fault** (my fake `User` model did not lowercase emails like the real Mongoose schema does, so I fixed the fake, not the code).

| Suite | Before fixes | After fixes | Log files |
|---|---|---|---|
| Back-end unit (`node:test`) | 33 run, 25 pass, **8 fail** | 41 run, **41 pass** | `backend-unit-BEFORE/AFTER-fixes.log` |
| Front-end unit (`node:test`) | 11 run, 0 pass, **11 fail** | 15 run, **15 pass** | `frontend-unit-BEFORE/AFTER-fixes.log` |
| Browser E2E (Playwright) | 14 run, 9 pass, **5 fail** | 14 run, **14 pass** | `e2e-BEFORE/AFTER-fixes.log` |

(The 8 `taskQuery` tests did not exist before the fix, which is why the "before" backend run has 33 tests and the "after" run has 41.)

## Findings

| # | Severity | Where | What was wrong | How it was found | Fix | Regression test |
|---|---|---|---|---|---|---|
| B1 | High (security) | `GET /api/tasks?status=` | `filter.status = req.query.status` was used as-is. Express parses `?status[$ne]=done` into an object, so a caller could inject MongoDB operators into the query (type confusion / NoSQL injection). Results were still limited to the caller's own tasks, which capped the damage. | Unit test `getTasks rejects operator objects` failed (expected 400, got 200) | New `utils/taskQuery.js` checks the **type** and allowed values of every query parameter; invalid input → 400 | `controllers.unit.js`, `taskQuery.unit.js`, Jest `query hardening` |
| B2 | Medium | `GET /api/tasks?search=` | User text went straight into `$regex`. `(urgent` or `[sprint` is an invalid pattern, so MongoDB errors and the request ends in a 500; crafted patterns can also be very slow (regex denial of service). | Unit test `getTasks survives regex metacharacters` failed | `utils/escapeRegex.js` escapes input so it matches literally; search capped at 100 chars | `controllers.unit.js`, `taskQuery.unit.js`, E2E #8 |
| B3 | Medium | `validateLogin` | Only checked that fields were truthy, so `{ "email": { "$gt": "" } }` reached the controller. | Unit test `validateLogin rejects object values` failed | Both fields must be non-empty strings | `validate.unit.js`, Jest `input type hardening` |
| B4 | Medium | `validateSignup` | `email: ["a@b.co"]` passed the regex (arrays stringify), then `email.toLowerCase()` in the controller threw → 500. | Unit test failed | `isString` check on name, email, password | `validate.unit.js`, Jest |
| B5 | Low | `validateTaskInput` | `description` could be an object and `dueDate` a number (`12345` parses as a year). | Two unit tests failed | Type checks added for both | `validate.unit.js`, Jest |
| B6 | Medium (security) | `errorHandler` | For unexpected errors the raw `err.message` was sent to the client — e.g. a driver message containing host, port or user. | Unit test `unexpected errors return 500 WITHOUT leaking internal details` failed | 5xx non-operational errors return a generic message; full detail is logged server-side only | `errorHandler.unit.js` |
| B7 | High (for quality) | `frontend/src/api/client.js` | `import.meta.env.VITE_API_URL` throws when the module is loaded anywhere except Vite, so the whole API layer was **untestable** and any tooling that imports it crashed. | All 11 front-end tests failed with `Cannot read properties of undefined (reading 'VITE_API_URL')` | `import.meta.env?.VITE_API_URL` | `api-client.unit.js` (all) |
| B8 | Medium (UX/security) | session handling | When a token expired *during* a session, API calls failed with 401 but the user stayed "logged in" on a page showing an error. Only startup checked the token. | Written as a test after reasoning about the flow; E2E #14 failed on the baseline ("still on /dashboard") | `client.js` clears the token and fires an `unauthorized` event; `AuthContext` listens and logs out; `ProtectedRoute` redirects | `api-client.unit.js`, E2E #14 |
| B9 | Low (perf/UX) | `Dashboard` | Every refetch replaced the whole list with "Loading…", unmounting and rebuilding every card. | Profiling (see below) and E2E #9 failed on the baseline (cards = 0 during refetch) | Keep the list visible (dimmed, `aria-busy`) while refetching | E2E #9 |
| B10 | Low | `backend/jest.config.js` | Contained an invalid option (`setupFilesAfterEach`) from Week 3, which Jest would warn about. Fixed in Week 4's package; recorded here for completeness. | Code review during integration | Correct key `setupFilesAfterEnv`; `testMatch` now limits Jest to `*.test.js` | — |
| H1 | Hardening | `app.js` | No request-body size limit | Review | `express.json({ limit: "10kb" })` | **Not covered by an executed test** |

## Honest limits of what was verified
* The **Jest + Supertest integration tests** (`backend/tests/*.test.js`) need `npm install` and MongoDB-in-memory; they could **not be run** in the environment where this work was produced. They are included, extended with regression cases, and should be run with `npm run test:integration`. The same behaviours *are* covered by the executed unit tests (with fakes) for the logic, and by E2E for the UI.
* The **E2E and performance runs** used a small dependency-free stand-in API with the same routes and response shapes as `backend/` (see `perf/standin/`), because npm was unreachable. Re-run them against the real stack with `BASE_URL` / `API_URL`.
* Fixes B1–B6 were verified by unit tests against the **real source files**; only the database and JWT/bcrypt libraries were replaced by fakes.

## Lessons learned
1. **A test that can't fail proves nothing.** Running the suite against the unfixed code (and the E2E suite against the old build) showed each test catches the bug it claims to catch.
2. **Validate types, not just values.** JSON and Express query parsing hand you arrays and objects. "Is it truthy / matches a regex" is not enough (B1, B3, B4, B5).
3. **Make code importable to make it testable.** One environment-specific line (B7) blocked every test of the API layer.
4. **Fix the test when the test is wrong.** Blindly "fixing" code to satisfy a faulty fake would have added a bug.
5. **Measure before optimizing, and report the whole result.** Layout and DOM churn improved clearly; total main-thread time did not change beyond noise. The real remaining cost is rendering 500 items at once, which points to pagination as the next step.
