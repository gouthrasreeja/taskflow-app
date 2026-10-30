import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const linkClass = ({ isActive }) => (isActive ? "active" : "");

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand"><span className="logo-dot" />TaskFlow</div>
      <div className="navbar-links">
        <NavLink to="/" end className={linkClass}>Home</NavLink>
        {user && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
        {user ? (
          <>
            <span className="navbar-user">Hi, {user.name.split(" ")[0]}</span>
            <button className="navbar-logout" onClick={handleLogout}>Log Out</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={linkClass}>Log In</NavLink>
            <NavLink to="/signup" className="navbar-cta">Sign Up</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
