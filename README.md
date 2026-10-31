# TaskFlow — Integrated Full Stack Application (Week 4)

TaskFlow is a task manager with a **React (Vite) front-end** and a **Node/Express + MongoDB back-end**. This week the Week 2 front-end was connected to the Week 3 REST API, replacing all mock data with real, authenticated API calls.

```
taskflow/
├── frontend/   React 18 + React Router + Vite   (http://localhost:5173)
└── backend/    Express + Mongoose + JWT          (http://localhost:5000)
```

## Running the whole app locally

Requires Node.js 18+ and MongoDB (local install, or a free MongoDB Atlas cluster).

### 1. Start the back-end
```bash
cd backend
npm install
cp .env.example .env        # then edit MONGO_URI and JWT_SECRET
npm run dev                 # API on http://localhost:5000/api
```
Check it: `curl http://localhost:5000/api/health`

### 2. Start the front-end (second terminal)
```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm run dev                 # app on http://localhost:5173
```

### 3. Use it
Open http://localhost:5173 → **Sign Up** → you land on the dashboard → create, edit, filter, search and delete tasks. Log out and back in: your tasks are loaded from MongoDB.

> The back-end's `CLIENT_ORIGIN` (in `backend/.env`) must match the front-end's origin (`http://localhost:5173` by default) or the browser will block requests with a CORS error.

### Tests
`cd backend && npm test` runs the Jest/Supertest suite against an in-memory MongoDB.

## How the integration works

| Concern | Implementation |
|---|---|
| API access | `frontend/src/api/client.js` — one `request()` wrapper around `fetch` that sets the JSON headers, attaches `Authorization: Bearer <token>`, parses the response, and throws an `Error` with the server's message on any non-2xx result |
| Auth state | `frontend/src/context/AuthContext.jsx` — React Context exposing `user`, `login`, `signup`, `logout`, and a `loading` flag while a saved session is verified via `GET /auth/me` |
| Token storage | JWT in `sessionStorage` (survives refresh, cleared when the tab closes) |
| Route protection | `ProtectedRoute` redirects logged-out visitors from `/dashboard` and `/tasks/:id` to `/login` |
| Data fetching | `Dashboard` and `TaskDetail` fetch in `useEffect`, with loading, error and empty states |
| Search / filter | Sent to the server as `?status=` and `?search=` (debounced 250 ms) instead of filtering in the browser |
| Mutations | Create (modal), update (detail page), delete — each calls the API and updates UI state from the server's response |

### Integration points between the layers
| Front-end call | Back-end endpoint |
|---|---|
| `api.signup` / `api.login` | `POST /api/auth/signup`, `POST /api/auth/login` |
| session restore | `GET /api/auth/me` |
| `api.getTasks(params)` | `GET /api/tasks?status=&search=` |
| `api.getTask(id)` | `GET /api/tasks/:id` |
| `api.createTask` | `POST /api/tasks` |
| `api.updateTask` | `PUT /api/tasks/:id` |
| `api.deleteTask` | `DELETE /api/tasks/:id` |

## Challenges and solutions

1. **Mock data shape did not match the real API.** The mock used `id` and a plain `YYYY-MM-DD` string; MongoDB returns `_id`, and `dueDate` is `null` or a full ISO timestamp. *Solution:* switched all keys and routes to `_id`, rendered `dueDate?.slice(0, 10)` with a "No due date" fallback, and sent `null` rather than an empty string when no date is chosen.
2. **CORS and hard-coded URLs.** Browsers block cross-origin calls unless the API allows the front-end's origin. *Solution:* the API base URL comes from `VITE_API_URL`, and the back-end reads the allowed origin from `CLIENT_ORIGIN`; both are documented in `.env.example` files.
3. **Network failures looked like silent bugs.** `fetch` only rejects when the network fails, not on 4xx/5xx. *Solution:* the wrapper converts both cases into a readable `Error` ("Could not reach the server…" or the API's own message) which every page shows in an alert region.
4. **Session lost on refresh.** Keeping the user only in React state logged them out on every reload. *Solution:* persist the token and, on startup, verify it with `/auth/me` before trusting it; `ProtectedRoute` waits on the `loading` flag so users are not bounced to `/login` mid-check.
5. **Out-of-order responses.** Typing quickly in the search box fires several requests; a slow early one could overwrite a newer result. *Solution:* a 250 ms debounce plus a `cancelled` flag in the effect cleanup so stale responses are ignored.
6. **New task appeared under the wrong filter.** Creating a "pending" task while the "done" tab was open inserted it into the visible list. *Solution:* insert locally only if the task matches the active filter.
7. **No package registry in the build environment.** The integration was assembled in a sandbox without `npm install`. *Solution:* each file was syntax-checked with esbuild, and the integrated UI was exercised end-to-end against a small dependency-free stand-in server implementing the *same* routes, status codes and response shapes as `backend/` (documented in `API_DOCUMENTATION.md`). The demo video was recorded that way. **Before relying on it, run the real stack as described above** — that is the configuration this project is intended for.

## Demo video
`TaskFlow_Integration_Demo.webm` shows: protected-route redirect → failed login handled gracefully → sign up → empty dashboard → creating tasks → editing status → server-side filter and search → delete → logout → login again with data intact.

## Further documentation
- `backend/API_DOCUMENTATION.md` — full endpoint reference
- `backend/README.md`, `frontend/README.md` — per-package notes

---

# Week 5 — Testing, Debugging & Optimization

## Testing strategy

| Level | Tool | What it covers | Where | Executed in the build environment? |
|---|---|---|---|---|
| Unit — back-end | Node built-in `node:test` (no install needed) | validators, error handler, query builder, async wrapper, **controllers & auth middleware with in-memory fakes** (ownership rules, 401/404/409 paths) | `backend/tests/unit/*.unit.js` | **Yes — 41/41 pass** |
| Unit — front-end | `node:test` | API client (headers, JWT, errors, 401 handling, query strings), date helpers | `frontend/tests/*.unit.js` | **Yes — 15/15 pass** |
| Integration — back-end | Jest + Supertest + in-memory MongoDB | real Express app + real Mongoose models over HTTP | `backend/tests/*.test.js` | **No** (needs `npm install`) — run it yourself |
| End-to-end | Playwright | real browser → real UI → API: auth, CRUD, filter/search, error handling, session expiry | `e2e/full-flow.e2e.cjs` | **Yes — 14/14 pass** (against a stand-in API) |

**Why these tools.** `node:test` ships with Node, so the unit suites run with zero setup and the back-end logic is tested against the *real source files*. Jest/Supertest exercise the full HTTP stack. Playwright validates what users actually do. Component-level (React Testing Library) tests are a documented next step; UI behaviour is currently covered at the E2E level.

**Test design rationale.** Each unit test targets one rule: *accept good input*, *reject each class of bad input*, *never touch another user's data*, *map each error type to the right status code*. Fakes (`tests/unit/helpers`) stand in for Mongoose, JWT and bcrypt so failures point at our code, not at a library.

## Running the tests

```bash
# Back-end unit tests (no database, no install needed beyond Node 18+)
cd backend && npm run test:unit

# Back-end integration tests (needs: npm install)
cd backend && npm run test:integration       # or: npm test  (runs both)

# Front-end unit tests (Node 18+, no install needed)
cd frontend && npm test

# End-to-end (start back-end and front-end first; needs: npm i -D playwright && npx playwright install chromium)
BASE_URL=http://localhost:5173 node e2e/full-flow.e2e.cjs

# Performance profile of the dashboard with 500 seeded tasks
BASE_URL=http://localhost:5173 API_URL=http://localhost:5000/api node perf/profile-dashboard.cjs "my run" 7
```

## Results (saved in `logs/`)

| Suite | Before fixes | After fixes |
|---|---|---|
| Back-end unit | 25 pass / **8 fail** (33) | **41 pass** / 0 fail |
| Front-end unit | 0 pass / **11 fail** (11) | **15 pass** / 0 fail |
| E2E | 9 pass / **5 fail** (14) | **14 pass** / 0 fail |

`docs/DEBUGGING_REPORT.md` lists every bug found (root cause, fix, regression test) and the lessons learned.

## Bugs found and fixed (summary)
Query-operator injection on `?status=` (B1) · regex crash/ReDoS on `?search=` (B2) · type confusion in login/signup/task validators (B3–B5) · internal error text leaked on 500 (B6) · API client crashed outside Vite so it was untestable (B7) · expired token mid-session left users stuck (B8) · list blanked on every refetch (B9).

## Optimizations

Profiled with Playwright + Chrome DevTools metrics: 500 tasks, 4× CPU throttle, one session of typing a search plus four filter changes, **median of 7 runs** (`logs/perf-BEFORE.json`, `logs/perf-AFTER.json`, chart in `docs/perf-before-after.png`).

| Metric | Before | After | Change |
|---|---|---|---|
| DOM nodes created per session | 9,732 | 5,280 | **−46 %** |
| Layout time | 238 ms | 141 ms | **−41 %** (ranges don't overlap) |
| Style recalculation | 91 ms | 70 ms | −23 % |
| Scripting | 475 ms | 407 ms | −14 % |
| Total main-thread task time | 1,914 ms | 1,891 ms | −1 % (**within noise — not claimed as a gain**) |

What changed: (1) `TaskCard` wrapped in `React.memo` so keystrokes in the search box no longer re-render every card; (2) the dashboard keeps the current list on screen while refetching instead of unmounting/rebuilding it.

Also applied but **not benchmarked** (no database available): `.lean()` on read queries, a compound `{ userId, createdAt }` index matching the list query, a 10 kB body-size limit.

**Bottleneck still open:** rendering all 500 tasks at once dominates total time. Server-side pagination or list virtualization is the recommended next step.

> The E2E and profiling numbers were produced against a stand-in API with the same contract as `backend/` (`perf/standin/`), since npm was unavailable in the build environment. Absolute times will differ on your machine; compare before/after on the same machine using the shipped scripts.
