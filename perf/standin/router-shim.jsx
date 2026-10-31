// Minimal functional stand-in for react-router-dom (demo build only).
import React, { createContext, useContext, useEffect, useState } from "react";
const Ctx = createContext(null), Params = createContext({});
export function BrowserRouter({ children }) {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => { const f = () => setPath(window.location.pathname); window.addEventListener("popstate", f); return () => window.removeEventListener("popstate", f); }, []);
  const navigate = (to, o = {}) => { window.history[o.replace ? "replaceState" : "pushState"]({}, "", to); setPath(to); };
  return <Ctx.Provider value={{ path, navigate }}>{children}</Ctx.Provider>;
}
const match = (pat, p) => { const names = []; const re = new RegExp("^" + pat.replace(/:[^/]+/g, (m) => (names.push(m.slice(1)), "([^/]+)")) + "$");
  const m = p.match(re); if (!m) return null; const o = {}; names.forEach((n, i) => (o[n] = m[i + 1])); return o; };
export function Routes({ children }) {
  const { path } = useContext(Ctx);
  for (const r of React.Children.toArray(children)) { const prm = match(r.props.path, path); if (prm) return <Params.Provider value={prm}>{r.props.element}</Params.Provider>; }
  return null;
}
export const Route = () => null;
export const useParams = () => useContext(Params);
export const useNavigate = () => useContext(Ctx).navigate;
export function Link({ to, children, className }) { const { navigate } = useContext(Ctx);
  return <a href={to} className={className} onClick={(e) => { e.preventDefault(); navigate(to); }}>{children}</a>; }
export function NavLink({ to, children, className, end }) { const { path, navigate } = useContext(Ctx);
  const active = end ? path === to : path.startsWith(to);
  return <a href={to} className={typeof className === "function" ? className({ isActive: active }) : className} onClick={(e) => { e.preventDefault(); navigate(to); }}>{children}</a>; }
export function Navigate({ to, replace }) { const { navigate } = useContext(Ctx); useEffect(() => { navigate(to, { replace }); }, []); return null; }
