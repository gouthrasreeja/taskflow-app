# TaskFlow — Back-End API (Week 3)

A RESTful API for the TaskFlow task management app, built with **Node.js**, **Express**, and **MongoDB (Mongoose)**. Implements secure authentication and full CRUD for tasks, following the architecture and database schema designed in Week 1 and consumed by the front-end built in Week 2.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** MongoDB via Mongoose
- **Auth:** JSON Web Tokens (JWT) + bcrypt password hashing
- **Testing:** Jest + Supertest + mongodb-memory-server (in-memory DB, no real database needed to run tests)

## Project Structure

```
server.js                    # Entry point - loads env, connects DB, starts listener
src/
  app.js                     # Express app setup (middleware + routes), separated from server.js for testability
  config/
    db.js                    # Mongoose connection
  models/
    User.js                  # User schema (name, email, passwordHash)
    Task.js                  # Task schema (title, description, status, dueDate, userId ref)
  middleware/
    requireAuth.js           # Verifies JWT, attaches req.user
    validate.js               # Request body validation for signup/login/tasks
    errorHandler.js           # Centralized error handling + 404 handler
  controllers/
    authController.js         # signup, login, getMe
    taskController.js         # getTasks, getTaskById, createTask, updateTask, deleteTask
  routes/
    authRoutes.js
    taskRoutes.js
  utils/
    ApiError.js               # Custom error class carrying an HTTP status code
    asyncHandler.js            # Wraps async route handlers so errors reach the error middleware
tests/
  setup.js                   # Spins up an in-memory MongoDB for the test run
  auth.test.js                 # Signup/login/me test cases
  task.test.js                  # Task CRUD, ownership, and filtering test cases
API_DOCUMENTATION.md          # Full endpoint reference (methods, params, responses)
```

## Security & Best Practices Implemented

- Passwords are hashed with **bcrypt** before storage — plaintext passwords are never saved or logged.
- Authentication uses **stateless JWTs**; protected routes are guarded by `requireAuth` middleware.
- Task routes are **scoped to the authenticated user** — a user can never read, edit, or delete another user's task (verified in `task.test.js`).
- Centralized **error handling middleware** converts Mongoose validation errors, duplicate-key errors, and invalid ObjectIds into clean, consistent JSON error responses instead of leaking stack traces.
- Input **validation middleware** rejects malformed requests (short passwords, invalid email format, invalid status values, invalid dates) before they reach the database.
- `.env` is git-ignored; a `.env.example` documents every required variable without exposing real secrets.
- CORS is restricted to the configured front-end origin rather than left fully open.

## Setup & Running Locally

Requires [Node.js](https://nodejs.org/) v18+ and either a local MongoDB instance or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then edit .env with your own MONGO_URI and JWT_SECRET

# 3. Start the server in development mode (auto-restarts on file changes)
npm run dev

# The API will be available at http://localhost:5000/api
# Confirm it's running:
curl http://localhost:5000/api/health
```

To start it in production mode instead: `npm start`.

## Running Tests

Tests use an **in-memory MongoDB** (via `mongodb-memory-server`), so no real database connection or `.env` file is needed to run them:

```bash
npm test
```

This runs the full suite covering:
- Signup validation and duplicate-email rejection
- Login success/failure
- Token verification on protected routes
- Task creation, listing, filtering by status, updating, and deleting
- Ownership enforcement (a user cannot access another user's tasks)

## API Documentation

See [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for the full list of endpoints, request/response formats, and error codes.

## Connecting the Week 2 Front-End

The React front-end built in Week 2 currently uses mock data (`src/data/mockTasks.js`). To connect it to this real API:
1. Replace the mock imports in `Dashboard.jsx` and `TaskDetail.jsx` with `fetch`/`axios` calls to this API's endpoints.
2. Store the JWT returned from `/api/auth/login` (e.g. in memory or `sessionStorage`) and attach it as an `Authorization: Bearer <token>` header on every request.
3. Enable the currently-disabled "New Task" button once `POST /api/tasks` is wired up.
