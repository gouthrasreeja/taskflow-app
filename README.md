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
