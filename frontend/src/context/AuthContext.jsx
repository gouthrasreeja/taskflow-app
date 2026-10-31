import { createContext, useContext, useEffect, useState } from "react";
import { api, authEvents, getToken, setToken, clearToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking for an existing session

  // On first load, verify any stored token with /auth/me instead of trusting it blindly.
  useEffect(() => {
    async function restoreSession() {
      if (!getToken()) return setLoading(false);
      try {
        const res = await api.getMe();
        setUser(res.data.user);
      } catch {
        clearToken(); // invalid or expired
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // If any API call reports an expired/invalid token, drop the user so ProtectedRoute redirects to /login.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    authEvents.addEventListener("unauthorized", onUnauthorized);
    return () => authEvents.removeEventListener("unauthorized", onUnauthorized);
  }, []);

  async function signup(name, email, password) {
    const res = await api.signup(name, email, password);
    setToken(res.data.token);
    setUser(res.data.user);
  }
  async function login(email, password) {
    const res = await api.login(email, password);
    setToken(res.data.token);
    setUser(res.data.user);
  }
  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
