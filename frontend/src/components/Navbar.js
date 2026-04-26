import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useWeb3, ROLES, ROLE_NAMES } from "../context/Web3Context";

export default function Navbar() {
  const { account, user, disconnect } = useWeb3();
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";
  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "";

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand"><span>🎓</span> ScholarChain</Link>

      <div className="navbar-nav">
        <Link to="/" className={isActive("/")}>Dashboard</Link>
        <Link to="/scholarships" className={isActive("/scholarships")}>Scholarships</Link>

        {/* Admin links */}
        {user?.role === ROLES.Admin && (
          <>
            <Link to="/create-scholarship" className={isActive("/create-scholarship")}>+ Announce</Link>
            <Link to="/admin" className={isActive("/admin")}>Admin Panel</Link>
          </>
        )}

        {/* User links */}
        {user?.role === ROLES.User && (
          <Link to="/my-applications" className={isActive("/my-applications")}>My Applications</Link>
        )}

        {/* Registration happens on the login screen */}
      </div>

      <div className="navbar-right">
        <span style={{ fontSize: ".75rem", color: "rgba(255,255,255,.8)", fontWeight: 600 }}>
          {user?.isRegistered ? `${ROLE_NAMES[user.role]}: ${user.name}` : "Not Registered"}
        </span>

        <div className="account-chip">
          <span className="dot" />{short}
        </div>

        <button onClick={disconnect}
          style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 6, padding: ".25rem .65rem", fontSize: ".75rem", cursor: "pointer" }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
