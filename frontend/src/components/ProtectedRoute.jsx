import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Redirects visitors without a valid session to the login page.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
