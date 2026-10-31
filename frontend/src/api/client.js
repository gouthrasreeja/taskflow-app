// `import.meta.env` only exists under Vite; optional chaining keeps this module importable
// (and unit-testable) in plain Node.
const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:5000/api";

// Lets the API layer tell the React app "your session is no longer valid" without importing React.
export const authEvents = new EventTarget();

// The JWT lives in sessionStorage: it survives a refresh in the same tab
// but is cleared when the tab closes.
const TOKEN_KEY = "taskflow_token";
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => sessionStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

// Central fetch wrapper: attaches the auth header, parses JSON, and throws a
// plain Error carrying the API's message so callers only need try/catch.
async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only rejects on network-level failure (server down, CORS, offline)
    throw new Error(`Could not reach the server. Is the back-end running at ${API_BASE}?`);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    // A 401 on a call that carried a token means it expired or was revoked:
    // drop it and let the app send the user back to the login page.
    if (res.status === 401 && auth && getToken()) {
      clearToken();
      authEvents.dispatchEvent(new Event("unauthorized"));
    }
    throw new Error(payload?.message || `Request failed (${res.status})`);
  }
  return payload;
}

export const api = {
  signup: (name, email, password) =>
    request("/auth/signup", { method: "POST", body: { name, email, password }, auth: false }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  getMe: () => request("/auth/me"),
  getTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ""}`);
  },
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (data) => request("/tasks", { method: "POST", body: data }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: "PUT", body: data }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};
