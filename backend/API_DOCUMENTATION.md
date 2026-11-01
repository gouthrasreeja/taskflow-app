# TaskFlow API Documentation

Base URL (local development): `http://localhost:5000/api`

All request and response bodies are JSON. All responses follow this shape:

```json
{ "success": true, "data": { /* ... */ } }
```

or, on error:

```json
{ "success": false, "message": "Human-readable error message" }
```

## Authentication

Most endpoints require a JSON Web Token, obtained from `/auth/signup` or `/auth/login`, sent on every subsequent request as:

```
Authorization: Bearer <token>
```

Tokens expire after the duration set in `JWT_EXPIRES_IN` (default 7 days).

---

## Auth Endpoints

### POST /api/auth/signup
Create a new user account.

**Request body**
| Field | Type | Required | Notes |
|---|---|---|---|
| name | string | yes | 2–60 characters |
| email | string | yes | must be unique, valid email format |
| password | string | yes | minimum 6 characters |

**Success response** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Ada Lovelace", "email": "ada@example.com", "createdAt": "..." },
    "token": "eyJhbGciOi..."
  }
}
```

**Error responses**
| Status | Cause |
|---|---|
| 400 | Missing/invalid name, email, or password (all three must be strings) |
| 409 | Email already registered |

---

### POST /api/auth/login
Authenticate an existing user.

**Request body**
| Field | Type | Required |
|---|---|---|
| email | string | yes |
| password | string | yes |

**Success response** `200 OK` — same shape as signup (`user` + `token`).

**Error responses**
| Status | Cause |
|---|---|
| 400 | Missing email or password |
| 401 | Incorrect email or password |

---

### GET /api/auth/me
Return the currently authenticated user. Useful for verifying a stored token is still valid.

**Headers:** `Authorization: Bearer <token>` (required)

**Success response** `200 OK`
```json
{ "success": true, "data": { "user": { "_id": "...", "name": "...", "email": "..." } } }
```

**Error responses**
| Status | Cause |
|---|---|
| 401 | Missing, malformed, invalid, or expired token |

---

## Task Endpoints

All task endpoints require authentication and only ever operate on tasks owned by the requesting user — requesting or modifying another user's task returns `404 Not Found`, never `403`, to avoid revealing that the task exists.

### GET /api/tasks
List the authenticated user's tasks.

**Query parameters (all optional)**
| Param | Type | Description |
|---|---|---|
| status | string | Filter to `pending`, `in-progress`, or `done` |
| search | string | Case-insensitive substring match on title |

**Error responses**
| Status | Cause |
|---|---|
| 400 | `status` is not one of the allowed values, `status`/`search` is not plain text (e.g. `?status[$ne]=done`), or `search` is longer than 100 characters |

Search text is matched literally (regex characters such as `(` or `[` are treated as ordinary characters).

**Success response** `200 OK`
```json
{
  "success": true,
  "count": 2,
  "data": [
    { "_id": "...", "title": "Write tests", "description": "", "status": "pending", "dueDate": null, "userId": "...", "createdAt": "...", "updatedAt": "..." }
  ]
}
```

---

### GET /api/tasks/:id
Fetch a single task by its ID.

**Success response** `200 OK` — `data` is the task object.

**Error responses**
| Status | Cause |
|---|---|
| 400 | `:id` is not a valid MongoDB ObjectId |
| 404 | Task not found, or belongs to another user |

---

### POST /api/tasks
Create a new task for the authenticated user.

**Request body**
| Field | Type | Required | Notes |
|---|---|---|---|
| title | string | yes | non-empty, max 120 chars |
| description | string | no | max 2000 chars |
| status | string | no | one of `pending` / `in-progress` / `done`, defaults to `pending` |
| dueDate | string (ISO date) | no | e.g. `"2026-09-30"` |

**Success response** `201 Created` — `data` is the created task.

**Error responses**
| Status | Cause |
|---|---|
| 400 | Missing/empty title, invalid status, or invalid dueDate |

---

### PUT /api/tasks/:id
Update an existing task. All fields are optional — only the fields provided are changed (partial update).

**Request body:** any subset of `title`, `description`, `status`, `dueDate`.

**Success response** `200 OK` — `data` is the updated task.

**Error responses**
| Status | Cause |
|---|---|
| 400 | Invalid status or dueDate |
| 404 | Task not found, or belongs to another user |

---

### DELETE /api/tasks/:id
Delete a task.

**Success response** `200 OK`
```json
{ "success": true, "data": {} }
```

**Error responses**
| Status | Cause |
|---|---|
| 404 | Task not found, or belongs to another user |

---

## Health Check

### GET /api/health
Unauthenticated. Used by the host's health check and by uptime monitors. Reports whether the database connection is up.

**Success response** `200 OK`
```json
{ "success": true, "status": "ok", "db": "connected", "uptimeSeconds": 1234, "timestamp": "2026-11-01T06:50:40.980Z" }
```
**Degraded response** `503 Service Unavailable` — same shape with `"success": false, "status": "degraded", "db": "disconnected"`.

---

## Cross-Cutting Behaviour

| Topic | Behaviour |
|---|---|
| Rate limiting | `POST /api/auth/login` and `/api/auth/signup`: 20 attempts per IP per 15 minutes (`AUTH_RATE_LIMIT_MAX`). Excess requests get `429` with a `Retry-After` header; `RateLimit-Limit` / `RateLimit-Remaining` are sent on every attempt |
| Request id | Every response carries `X-Request-Id`. Responses for unexpected `500` errors also include `"requestId"` in the body |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'`, `Cache-Control: no-store`, `Strict-Transport-Security` (production) |
| CORS | Only origins listed in `CLIENT_ORIGIN` are allowed (required in production) |
| Body size | JSON bodies larger than 10 kB are rejected |

## Error Handling Summary

| Status | Meaning |
|---|---|
| 400 | Bad Request — validation failed |
| 401 | Unauthorized — missing/invalid credentials or token |
| 404 | Not Found — resource doesn't exist or isn't owned by this user |
| 429 | Too Many Requests — login/signup rate limit exceeded |
| 409 | Conflict — duplicate email on signup |
| 500 | Internal Server Error — unexpected failure (generic message; use `requestId` to find details in the server log) |

## Data Models

**User**
```
{ _id, name, email (unique), passwordHash (never returned), createdAt, updatedAt }
```

**Task**
```
{ _id, title, description, status: "pending"|"in-progress"|"done", dueDate, userId (ref -> User), createdAt, updatedAt }
```
