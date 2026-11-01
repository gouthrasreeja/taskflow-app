# TaskFlow — User Acceptance Test (UAT) Plan and Record

**This is a record to complete after you deploy.** The *Result* columns are intentionally blank — fill them in from what you actually see on the live site; do not copy results from anywhere else.

| Item | Value |
|---|---|
| Front-end URL | ______________________________ |
| API URL | ______________________________ |
| Date / time | ______________________________ |
| Tester | ______________________________ |
| Browser(s) / device(s) | ______________________________ |
| Smoke-test result (`smoke-test-live.log`) | ___ pass / ___ fail |

## A. Functional acceptance
| ID | Scenario | Steps | Expected | Result (Pass/Fail) | Notes / screenshot |
|---|---|---|---|---|---|
| UAT-01 | Landing page loads over HTTPS | Open the front-end URL | Page shows, padlock present, no console errors | | |
| UAT-02 | Protected page guard | Logged out, open `/dashboard` | Redirected to Log In | | |
| UAT-03 | Sign up | Create an account | Lands on empty dashboard; "Hi, <name>" in navbar | | |
| UAT-04 | Duplicate sign-up | Sign up again with same e-mail | Clear error message, no crash | | |
| UAT-05 | Wrong password | Log in with a wrong password | "Invalid email or password" shown | | |
| UAT-06 | Create task | + New Task, enter title, save | Task appears at top of list | | |
| UAT-07 | Edit task | Open it, change status to Done, Save | "Saved to server"; dashboard shows Done | | |
| UAT-08 | Filter and search | Click Done / All; search part of a title; search `(` | Correct lists, no error for `(` | | |
| UAT-09 | Delete task | Open task → Delete → confirm | Task disappears | | |
| UAT-10 | Persistence | Log out, log in again | Tasks still there | | |
| UAT-11 | Refresh | Reload `/dashboard` | Stays logged in on the dashboard (no 404) | | |
| UAT-12 | Two users isolated | Second account (other browser/private window) | Sees none of the first user's tasks | | |

## B. Non-functional acceptance
| ID | Check | Expected | Result | Notes |
|---|---|---|---|---|
| UAT-13 | Cold start | First load after 15+ min idle | Works within ~1–2 min (record actual: ___ s) | |
| UAT-14 | Warm response | Click around dashboard | Each action feels instant (< 1 s) | |
| UAT-15 | Mobile layout | Phone or 380 px-wide window | No horizontal scrolling; buttons usable | |
| UAT-16 | Keyboard use | Tab through login form and task cards; Enter opens a task | Focus visible, everything reachable | |
| UAT-17 | Security headers | Browser DevTools → Network → any API call | `x-content-type-options`, `x-frame-options`, `x-request-id` present; no `x-powered-by` | |
| UAT-18 | Rate limit | Smoke test with `RATE_LIMIT_TEST=1` | 429 after about 20 attempts | |
| UAT-19 | API down message | (Optional) pause the API, reload | Readable error, not a blank page | |

## C. Sign-off
Defects found (ID, severity, fix or decision): ______________________________________________

Accepted for release?  ☐ Yes  ☐ Yes, with known issues  ☐ No        Signed: ____________  Date: __________
