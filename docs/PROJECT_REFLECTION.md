# TaskFlow — Project Reflection (Weeks 1–6)

## 1. The project in one paragraph
Over six weeks I planned, built, integrated, tested and deployed **TaskFlow**, a full stack task manager: React and React Router on the front-end, Node.js/Express and MongoDB on the back-end, JWT authentication, automated tests, and a documented deployment on free-tier hosting. I worked with an AI assistant (Claude) for much of the code generation, explanation and debugging help, so a large part of what I learned was how to **direct, check and question** generated work rather than just accept it. Where something could not be verified, I tried to say so plainly in each week's documentation.

## 2. Timeline
| Week | Delivered | Main thing I learned |
|---|---|---|
| 1 | Project brief, user-flow chart, wireframes, architecture diagram, schema | Deciding endpoints and the data model *first* made every later week easier; the Week 1 API list stayed essentially unchanged to the end |
| 2 | React front-end: landing, dashboard, detail view, responsive CSS | Components, routing, controlled forms, and how a layout adapts at small widths |
| 3 | Express API: auth, task CRUD, validation, error middleware, tests, API docs | Layering (routes → controllers → models), JWT, password hashing, why ownership checks belong in every query |
| 4 | Front-end connected to the API | The real work of integration: data shapes, CORS, loading/error states, session restore |
| 5 | Unit, integration and E2E tests; ten bugs fixed; profiling | Tests are only trustworthy if they can fail; measure before optimizing |
| 6 | Production hardening, deployment guide, maintenance plan, UAT plan, this reflection | A working app is not a deployable app: configuration, security, monitoring and recovery are part of the job |

## 3. What went well
* **Plan first, then build.** The architecture and schema from Week 1 acted as a contract. When the front-end needed `_id` instead of `id`, or `null` dates, I could see exactly where the mismatch was, because the contract was written down.
* **Small, repeated delivery.** Committing and pushing each week meant the repository always held a working state, and the history tells the story of the project.
* **Separation of concerns.** Putting all network code in one API client, all auth state in one context, and all error mapping in one middleware kept changes small. The Week 5 fix for expired tokens touched two files because of this.
* **Testing found real problems.** Writing tests and running them against my own existing code exposed ten genuine defects, including operator injection through a query parameter, regular-expression crashes from the search box, and error messages leaking internal details. Seeing a test fail first, then pass after the fix, was the most convincing lesson of the course.
* **Honest measurement.** The profiling showed layout time fell 41 % while total main-thread time did not change beyond noise. Reporting that, instead of only the good numbers, made the conclusion (paginate the list) more credible.
* **Documentation as a habit.** Each week's README, API reference and report forced me to explain decisions, which exposed gaps in my own understanding.

## 4. Challenges and how I handled them
| Challenge | What happened | What I took from it |
|---|---|---|
| **Git and the terminal** | I ran commands from the wrong folder (`not a git repository`), mistyped `git add.`, left out the commit message, had a push rejected because GitHub already had a commit, hit a command split over two lines, and once committed with "nothing to commit" because I had not yet copied the new files into the repo | Read the error text word for word; check `pwd`, `ls` and `git status` *before* committing; the error usually names the fix |
| **Restructuring the repo** | In Week 4 the single-folder project had to become `frontend/` + `backend/` without losing history | `git mv` preserves history; verify with `git status` before committing |
| **Integration mismatches** | Mock data used `id` and plain dates; MongoDB returns `_id` and timestamps | Treat the API as the source of truth and convert at the edges |
| **Sessions and expiry** | A token that expired mid-session left the user stuck on an error page | Authentication state must react to the server's answer, not only to the first page load |
| **Environment limits** | Some tooling (installing packages, running the real database) was not available in the environment where the assistant generated and checked code, so I could not rely on "it ran" everywhere | Say exactly what was verified and what was not; keep the unverified parts easy for me to run (smoke test, integration tests) |
| **Free-tier hosting** | Sleeping services, no database backups, no fixed IPs | Design around the limits and document them (cold-start note, manual backup script, strong DB password) |

## 5. Lessons learned
1. **A test that cannot fail proves nothing.** Run new tests against old code, or break something on purpose, to see them go red.
2. **Validate types, not only values.** JSON and query strings can carry arrays and objects.
3. **Make failure visible and specific.** Startup validation that lists every missing setting is far better than a vague crash later; users should see "Could not reach the server", not a blank page.
4. **Never trust a default in production.** A wildcard CORS fallback or a placeholder secret is fine on a laptop and dangerous online, so production now refuses to start with them.
5. **Operations are features.** Logs with request ids, a health check that includes the database, backups and a rollback path decide whether a problem takes minutes or days to fix.
6. **AI assistance needs verification.** Generated code was useful but sometimes wrong (for example a Jest option I later found invalid, or a faulty test fake). The habit that helped: ask for tests, run them, read failures, and check claims against the docs.

## 6. Areas for self-improvement
* **Run the full stack with the real database more often** during development instead of relying on stand-ins, and add component tests (React Testing Library) alongside the E2E tests.
* **Deepen security knowledge:** move the token to an httpOnly cookie with CSRF protection, add refresh tokens, a Content-Security-Policy, and e-mail verification/password reset.
* **Learn containers (Docker)** so that "works on my machine" and "works on the server" are the same thing, and CI/CD beyond the basic workflow.
* **Estimate and track time.** Each task suggested 30–35 hours; I did not record actual time per activity, which would make future planning more accurate.
* **Understand tools beneath the abstractions:** read the Mongoose, Express and React Router documentation directly rather than only through generated examples.
* **Accessibility:** go beyond keyboard-focus checks to screen-reader testing and a formal audit.

## 7. What I would do differently next time
1. Add **pagination and indexes from the first version** of any list endpoint.
2. Use **TypeScript** with shared types for API requests/responses to catch the `id`/`_id` class of bug at compile time.
3. Set up **CI on day one**, so tests run on every push instead of being added in week 5–6.
4. Deploy a **walking skeleton in week 1** (a trivial page and health endpoint on the real host), so deployment surprises appear early rather than last.
5. Treat **observability** (structured logs, error tracking) as part of the first backend commit.

## 8. In my own words
[Add a few sentences about what you personally found hardest, what surprised you, and one concrete thing you can now do that you could not at the start of the internship.]
