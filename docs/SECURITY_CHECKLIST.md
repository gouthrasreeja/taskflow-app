# TaskFlow — Security Checklist

Status key: **✔ Tested** = covered by an executed automated test · **✔ Implemented** = in code, but not covered by a test that could be executed in the build environment (run `npm run test:integration` / the smoke test) · **☐ Manual** = you must do it in the dashboards.

| Area | Measure | Status |
|---|---|---|
| Authentication | Passwords hashed with bcrypt; never returned by the API | ✔ Implemented (smoke test checks responses for leaks) |
| Authentication | JWT-protected task routes; token verified on every request; deleted users rejected | ✔ Tested (`controllers.unit.js`) |
| Authorization | Every task query scoped to the signed-in user; other users get 404 | ✔ Tested (unit + smoke test) |
| Brute force | Rate limit on login/signup (20 / 15 min / IP), returns 429 + `Retry-After` | ✔ Tested (`rateLimiter.unit.js`); live check via `RATE_LIMIT_TEST=1` |
| Input validation | All body fields type-checked; query parameters validated (blocks operator injection); search text escaped | ✔ Tested |
| Error handling | 5xx responses never expose internals; request id returned instead | ✔ Tested (`errorHandler.unit.js`) |
| Transport | HTTPS enforced by the host; HSTS header sent in production | ✔ Tested (header logic) · live check in smoke test |
| Headers | `nosniff`, `X-Frame-Options: DENY`, `no-referrer`, CSP `default-src 'none'`, `Cache-Control: no-store`; `X-Powered-By` removed | ✔ Tested (`securityHeaders.unit.js`) |
| CORS | Explicit allow-list from `CLIENT_ORIGIN`; wildcard refused in production at startup | ✔ Tested (`env.unit.js`) · live check in smoke test |
| Configuration | App refuses to start with missing/weak secrets or origin | ✔ Tested (`env.unit.js`) |
| Request size | JSON body limited to 10 kB | ✔ Implemented |
| Secrets | `.env` git-ignored; secrets only in host environment variables; `.env.example` has placeholders | ✔ Implemented · ☐ Manual: never paste real values into chat/screenshots |
| Database | Dedicated least-privilege user (readWrite on one DB) | ☐ Manual (Atlas) |
| Database | Network allow-list | ☐ Manual — `0.0.0.0/0` is required on Render free tier; compensated by strong password |
| Accounts | Two-factor authentication on GitHub, Render, Atlas | ☐ Manual |
| Dependencies | `npm audit` in CI (high severity fails the build); Dependabot weekly PRs | ✔ Implemented (not run offline) |
| Logging | Structured logs; query strings, passwords and tokens are not logged | ✔ Tested (`requestLogger.unit.js`) |

## Known gaps and accepted risks (honest list)
1. **JWT is kept in `sessionStorage`**, so a cross-site-scripting bug could steal it. A more robust design uses an `httpOnly`, `Secure`, `SameSite` cookie plus CSRF protection. Not done: it changes the auth flow across both halves.
2. **No token revocation / refresh tokens.** A stolen token is valid until it expires (7 days). Shorten `JWT_EXPIRES_IN` to reduce exposure.
3. **Rate limiter is in memory** (per instance, resets on restart). Fine for one instance; use a shared store (e.g. Redis) when scaling out.
4. **No e-mail verification or password reset.**
5. **Front-end has basic security headers but no Content-Security-Policy**, because a correct policy must list the deployed API origin; add `connect-src 'self' https://<api>` once URLs are final.
6. **Atlas free tier has no automated backups** — see the maintenance plan for the manual backup procedure.
7. `npm audit` could not be run in the build environment (no network); CI runs it on every push.
