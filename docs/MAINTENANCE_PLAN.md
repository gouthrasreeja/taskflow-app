# TaskFlow — Maintenance Plan

**Owner:** one maintainer (the developer). **Environments:** local → production (Render + Atlas). Everything below is sized for a small, free-tier deployment and notes what to change when it grows.

## 1. Logging
The API writes **one JSON object per line** to standard output; Render's *Logs* tab collects it. Real examples from the code:

```json
{"time":"2026-11-01T06:50:40.980Z","level":"info","msg":"request","id":"9f518144-…","method":"POST","path":"/api/auth/login","status":200,"ms":0,"ip":"203.0.113.7"}
{"time":"…","level":"warn","msg":"request","id":"a4a92d76-…","method":"POST","path":"/api/auth/login","status":401,"ms":0,"ip":"203.0.113.7"}
{"time":"…","level":"error","msg":"unhandled_error","requestId":"b7c0…","name":"MongoServerSelectionError","message":"Server selection timed out after 10000 ms"}
{"time":"…","level":"info","msg":"server_started","port":10000,"env":"production"}
```

| Practice | Detail |
|---|---|
| Levels | `info` normal traffic · `warn` 4xx (bad logins, 404s, 429s) · `error` 5xx and crashes. `LOG_LEVEL=error|warn|info|debug` changes verbosity without code changes |
| Correlation | Each request gets an id, returned to the client as `X-Request-Id` (and in the body of 5xx responses as `requestId`). A user can quote it; search the logs for it |
| Privacy | Query strings are **not** logged (search terms), nor passwords or tokens. IP and user id are logged for abuse investigation — treat logs as personal data and don't share them publicly |
| Key events | `config_error`, `startup_failed`, `mongo_error`, `unhandled_rejection`, `uncaught_exception`, `shutdown_started/complete` |
| Retention | Render keeps logs for a limited time on free plans. For long-term retention add a log drain (e.g. Better Stack, Papertrail) |

Useful searches in the log viewer: `"level":"error"` · `"status":429` · `"path":"/api/auth/login"` · a specific `requestId`.

## 2. Monitoring and error reporting
| What | How | Alert |
|---|---|---|
| Availability | Uptime monitor (UptimeRobot / Better Stack free tier) polling `https://<api>/api/health` every 5 min; health returns **503 when the database is unreachable**, so it covers DB outages too | E-mail on 2 consecutive failures |
| Deploy failures | Render notifications (Account → Notifications) | E-mail |
| Exceptions | Structured `error` logs now; when traffic grows add **Sentry**: `npm i @sentry/node`, initialise at the top of `server.js`, register `Sentry.setupExpressErrorHandler(app)` before `errorHandler`; add `@sentry/react` to the front-end | Sentry e-mail on new issue |
| Capacity | Atlas dashboard: storage (limit 512 MB on M0), connections, ops/sec | Atlas alert at 80 % storage |
| Security signals | Spikes of `status:401` or `429` on `/api/auth/login` in logs | Weekly review |

**Cold starts:** free web services sleep after 15 minutes without traffic and take about a minute to wake. A 5-minute uptime ping avoids this, but a single always-awake service uses ~744 of the 750 free instance-hours per month, so it only works for one service. The paid instance removes the issue.

## 3. Routine schedule
| When | Task |
|---|---|
| Daily (2 min) | Glance at alert e-mails |
| Weekly (15 min) | Review error/429 log spikes · run `node scripts/smoke-test.cjs` against production · take a database backup (§5) |
| Monthly (1 h) | `npm outdated` + merge Dependabot PRs after CI is green · `npm audit` · check Atlas storage · confirm Node version is still supported |
| Quarterly (2 h) | Test a restore from backup · rotate `JWT_SECRET` and the database password · review who has access to GitHub/Render/Atlas · re-read hosting limits/pricing |

## 4. Update and release procedure
1. Branch from `main` → code + tests → push → open a **Pull Request**.
2. CI (`.github/workflows/ci.yml`) runs back-end unit + integration tests, front-end tests, a production build and `npm audit`. **Merge only when green.**
3. Merge to `main` → Render builds and deploys automatically; watch the logs for `server_started`.
4. Run the smoke test against production. If it fails, **roll back** (Render → Deploys → previous deploy → *Rollback*) and fix on the branch.
5. Schema changes: keep them **additive** (new optional fields with defaults) so old and new code both work during a deploy; take a backup first; for bulk changes write a one-off script and test it on a copy.
6. Dependency policy: patch/minor updates monthly; majors one at a time with a changelog read; Node moves to the next LTS before the current one reaches end-of-life. Current choice: **Node 24** (Active LTS, supported to 30 Apr 2028); Node 20 is already end-of-life (30 Apr 2026) and Node 22 ends 30 Apr 2027. Re-check https://nodejs.org/en/about/previous-releases each quarter.
7. Record each release (git tag + short note: what changed, how it was verified).

**Secret rotation**
* `JWT_SECRET`: change in Render → service restarts → every user must log in again (announce it).
* Database password: create a second Atlas user, switch `MONGO_URI`, confirm health, delete the old user.

## 5. Backup and recovery
Atlas **M0 has no automated backups**, so backups are manual:
```bash
MONGO_URI="mongodb+srv://…/taskflow" ./scripts/backup-mongodb.sh     # needs MongoDB Database Tools
mongorestore --uri="$MONGO_URI" backups/taskflow-YYYYMMDD-HHMMSS      # restore
```
Store backup folders off the laptop (cloud drive), never in Git (`backups/` is git-ignored). Targets for this project: **RPO 7 days** (weekly backup), **RTO 1 hour**. Upgrading the cluster to a paid tier adds continuous backups.

## 6. Incident runbook
| Symptom | First checks | Action |
|---|---|---|
| Site shows "Could not reach the server" | Open `/api/health`; Render service status | If asleep, wait ~1 min. If crashed, read the last `error` logs; roll back if it began after a deploy |
| `/api/health` = 503 | Atlas cluster status, user, network access | Fix Atlas; the API reconnects by itself |
| Users cannot log in | Logs for 401 vs 429 vs 5xx; was `JWT_SECRET` changed? | 429 → wait/raise limit; 5xx → see logs by `requestId` |
| Slow responses | `ms` field in request logs; Atlas ops/sec | Add the `{userId, createdAt}` index (already defined), paginate lists, upgrade instance |
| Bad release | Smoke test failing after deploy | Rollback first, diagnose second |
| Suspected breach | Unusual 401/429 patterns, unknown data | Rotate `JWT_SECRET` and DB password, review Atlas access list and audit log, restore from backup if data was altered |

## 7. Capacity and cost triggers to upgrade
Sleep/cold-start complaints → paid Render instance (from about $7/month). Atlas storage > 80 % or need backups → paid cluster. Several API instances → move rate-limit counters to Redis. More than a few hundred tasks per user → server-side pagination (the profile in Week 5 showed list rendering as the main cost).
