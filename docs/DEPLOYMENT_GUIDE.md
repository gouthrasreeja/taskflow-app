# TaskFlow — Deployment Guide

Target stack (all have a free tier): **MongoDB Atlas** (database) → **Render Web Service** (Node/Express API) → **Render Static Site** (React front-end).
Any similar host works (Railway, Fly.io, Vercel/Netlify for the front-end); the same environment variables apply. Free-tier rules change, so confirm limits on each provider's pricing page.

```
 Browser ──HTTPS──▶ Render Static Site  (taskflow-web: the built React app)
    │
    └──HTTPS (fetch, CORS-restricted)──▶ Render Web Service (taskflow-api: Express)
                                                │ mongodb+srv (TLS)
                                                ▼
                                         MongoDB Atlas M0 (database "taskflow")
```

## 0. Before you deploy (do once, on your own PC)

1. Make sure the latest code is on GitHub (`git status` clean, `git push` done).
2. **Create lock files.** In `backend/` and `frontend/` run `npm install`, then commit the generated `package-lock.json` files. They make every build install exactly the same versions.
3. Run the stack locally once (see root README) so you know it works before blaming the host.
4. Create free accounts: GitHub (already), MongoDB Atlas, Render. Turn on two-factor authentication on all three.

## 1. Database — MongoDB Atlas

1. **Build a Database → M0 (Free)**. Provider AWS; pick a region near your users and near Render's region (e.g. Singapore for both — check the regions offered when you create each).
2. **Database Access → Add New Database User.** Username `taskflow_app`, a long generated password. Under *Specific Privileges* give **readWrite on database `taskflow` only** (not "Atlas admin").
3. **Network Access → Add IP Address.** Render's free web services do not have a fixed outbound IP, so choose *Allow access from anywhere* (`0.0.0.0/0`). This is safe only because the user has a strong password and minimal rights; Render publishes outbound IP ranges per region if you want to allow-list those instead.
4. **Connect → Drivers → copy the connection string.** Change it to include the database name and your password:
   `mongodb+srv://taskflow_app:<PASSWORD>@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority`
   If the password contains `@ : / ? # %`, URL-encode it (`@` → `%40`) or generate a password using only letters and digits.

## 2. API — Render Web Service

1. Render dashboard → **New → Web Service** → connect your GitHub repo.
2. Settings:

| Field | Value |
|---|---|
| Name | `taskflow-api` |
| Region | same region as the database |
| Branch | `main` |
| **Root Directory** | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance type | Free |
| Health Check Path (Advanced) | `/api/health` |

3. **Environment variables** (Advanced → Add):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24` (Node 20 reached end of life on 30 Apr 2026; use an Active LTS) |
| `MONGO_URI` | the Atlas string from step 1.4 |
| `JWT_SECRET` | a random 48+ character string: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_ORIGIN` | for now `https://example.com` (you will replace it in step 4) |

4. **Create Web Service.** Watch the *Logs*. A healthy start prints `mongo_connected` then `server_started`. If a variable is wrong, the app stops immediately and prints a `config_error` line naming the problem — that is by design.
5. Open `https://<your-api>.onrender.com/api/health`. Expected: `{"success":true,"status":"ok","db":"connected",...}`.

## 3. Front-end — Render Static Site

1. **New → Static Site** → same repo.

| Field | Value |
|---|---|
| Name | `taskflow-web` |
| **Root Directory** | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

2. **Environment variable:** `VITE_API_URL` = `https://<your-api>.onrender.com/api` (https, ends with `/api`, no trailing slash). *This value is baked in at build time — changing it needs a new deploy.*
3. **Redirects/Rewrites → Add Rule:** Source `/*`, Destination `/index.html`, Action **Rewrite**. Without it, refreshing `/dashboard` returns 404 because the page only exists inside the React app.
4. **Create Static Site** and wait for *Live*. Note its URL, e.g. `https://taskflow-web.onrender.com`.

## 4. Connect the two (CORS)

On the **API** service change `CLIENT_ORIGIN` to the exact front-end origin — `https://taskflow-web.onrender.com` (scheme + host only: no path, no trailing slash). Saving redeploys the API. Several origins can be listed separated by commas.

## 5. One-file alternative (Blueprint)

`render.yaml` in the repo root describes both services. In Render: **New → Blueprint** → pick the repo → fill in the prompted values (`MONGO_URI`, `CLIENT_ORIGIN`, `VITE_API_URL`). If Render reports a schema problem, fall back to the manual steps above (Render's blueprint syntax evolves).

## 6. Verify the deployment

1. Automated smoke test (Node 22+, no install):
   ```bash
   API_URL=https://<your-api>.onrender.com/api \
   FRONTEND_URL=https://<your-web>.onrender.com \
   RATE_LIMIT_TEST=1 node scripts/smoke-test.cjs | tee smoke-test-live.log
   ```
   (Windows Git Bash accepts the same syntax. The first request can take ~1 minute while a sleeping free instance wakes.)
2. Manual user-acceptance tests: `docs/UAT_PLAN.md`.
3. Keep `smoke-test-live.log` and screenshots as evidence for the report.

## 7. Updating the live site

Render redeploys automatically on every push to `main`. Recommended flow: work on a branch → open a Pull Request → CI (`.github/workflows/ci.yml`) runs the tests → merge → deploy. To undo a bad release, use **Deploys → Rollback** on the service (or `git revert` and push).

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| API logs show `config_error … CLIENT_ORIGIN is required` / `JWT_SECRET must be at least 32 characters` | Missing or weak environment variable | Fix it in *Environment*; the service redeploys |
| `startup_failed … Server selection timed out` | Atlas Network Access blocks Render, wrong host in `MONGO_URI`, or cluster paused | Add `0.0.0.0/0` (or Render's IP ranges); re-copy the connection string; check the cluster is running |
| `bad auth : Authentication failed` | Wrong DB user/password, or special characters not URL-encoded | Reset the Atlas password to letters+digits, update `MONGO_URI` |
| Build fails: `Cannot find module` / `package.json not found` | **Root Directory** not set to `backend` / `frontend` | Set it and redeploy |
| Build fails on `npm ci` | No `package-lock.json` committed | Commit lock files (step 0.2) or use `npm install` |
| Site loads but every action says *"This site is not connected to its server yet"* | `VITE_API_URL` was not set **when the site was built** | Set it, then *Manual Deploy → Clear build cache & deploy* |
| *"Could not reach the server"* | API asleep (free tier), wrong `VITE_API_URL`, or API crashed | Open the API `/api/health` URL; wait ~1 min; check API logs |
| Browser console: *blocked by CORS policy* | `CLIENT_ORIGIN` differs from the real front-end origin (http vs https, trailing slash, wrong subdomain) | Copy the origin exactly from the address bar |
| Refreshing `/dashboard` shows *Not Found* | Missing SPA rewrite rule | Add `/*` → `/index.html` (Rewrite) |
| First request very slow (30–60 s) | Free web services sleep after 15 minutes idle | Expected on free tier. Mitigate with a paid instance, or an uptime monitor (it consumes the shared 750 free instance-hours/month) |
| Login returns `429 Too many attempts` | Rate limiter (20 login/signup attempts per 15 min per IP) | Wait 15 minutes; raise `AUTH_RATE_LIMIT_MAX` if many users share one IP |
| `/api/health` returns 503 `db: disconnected` | Database unreachable | Check Atlas status, user, network rules; the service will recover when the DB does |
| Everyone suddenly logged out | `JWT_SECRET` changed | Expected after rotation; users log in again |
| Changes not visible after push | Auto-deploy off, build failed, or browser cache | Check the service *Events* tab; hard-refresh |
| Mixed-content errors | `VITE_API_URL` uses `http://` | Use the `https://` URL |
| Writes failing / "quota" errors | Atlas M0 storage (512 MB) full | Delete old data or upgrade the cluster |
