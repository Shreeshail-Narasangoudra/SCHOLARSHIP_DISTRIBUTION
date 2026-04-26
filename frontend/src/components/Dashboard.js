import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWeb3, ROLES, SCHOLARSHIP_STATUS } from "../context/Web3Context";

const statusColor = { 0: "badge-blue", 1: "badge-yellow", 2: "badge-green", 3: "badge-red" };

export default function Dashboard() {
  const { contract, user } = useWeb3();
  const [stats,   setStats]   = useState({ total: 0, active: 0, completed: 0, totalFund: "0" });
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contract) return;
    (async () => {
      try {
        const ids = await contract.getAllScholarshipIds();
        const list = await Promise.all(ids.map(id => contract.getScholarship(id)));
        let totalWei = 0n;
        let active = 0, completed = 0;
        list.forEach(s => {
          if (Number(s.status) === 0) active++;
          if (Number(s.status) === 2) completed++;
          try { totalWei += ethers.toBigInt(s.totalFund); } catch {}
        });
        setStats({ total: list.length, active, completed, totalFund: parseFloat(ethers.formatEther(totalWei)).toFixed(3) });
        setRecent([...list].reverse().slice(0, 6));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [contract]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  const isAdmin = user?.role === ROLES.Admin;
  const isUser  = user?.role === ROLES.User;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome{user?.isRegistered ? `, ${user.name}` : ""}! 👋</h1>
        <p>
          {isAdmin && "Logged in as Admin — You can announce scholarships, review applications and disburse funds."}
          {isUser  && `Logged in as User · ${user.institution} · Roll No: ${user.studentId}`}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Scholarships</span>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-desc">Announced on-chain</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active</span>
          <span className="stat-value" style={{ color: "var(--info)" }}>{stats.active}</span>
          <span className="stat-desc">Open for applications</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value" style={{ color: "var(--success)" }}>{stats.completed}</span>
          <span className="stat-desc">Fully disbursed</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Funds</span>
          <span className="stat-value" style={{ color: "var(--accent)", fontSize: "1.3rem" }}>{stats.totalFund}</span>
          <span className="stat-desc">ETH locked on-chain</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap mb-2">
        {isAdmin && <Link to="/create-scholarship" className="btn btn-primary">📢 Announce Scholarship</Link>}
        {isAdmin && <Link to="/admin" className="btn btn-secondary">⚙️ Admin Panel</Link>}
        {isUser  && <Link to="/scholarships" className="btn btn-primary">🔍 Browse & Apply</Link>}
        {isUser  && <Link to="/my-applications" className="btn btn-secondary">📄 My Applications</Link>}
        <Link to="/scholarships" className="btn btn-secondary">📋 View All Scholarships</Link>
      </div>

      {/* Recent scholarships table */}
      <div className="card">
        <div className="card-header flex-between">
          <div>
            <h2>Recent Scholarships</h2>
            <p>Latest announcements recorded on the blockchain</p>
          </div>
          <Link to="/scholarships" className="btn btn-secondary btn-sm">View All</Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎓</div>
            <h3>No scholarships yet</h3>
            {isAdmin && <Link to="/create-scholarship" className="btn btn-primary mt-2">Announce First Scholarship</Link>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Title</th><th>Per Student (ETH)</th>
                  <th>Recipients</th><th>Deadline</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(s => (
                  <tr key={s.scholarshipId.toString()}>
                    <td>#{s.scholarshipId.toString()}</td>
                    <td><strong>{s.title}</strong></td>
                    <td>{parseFloat(ethers.formatEther(s.perStudentAmount)).toFixed(3)} ETH</td>
                    <td>{s.disbursedCount.toString()} / {s.maxRecipients.toString()}</td>
                    <td>{new Date(Number(s.deadline) * 1000).toLocaleDateString()}</td>
                    <td><span className={`badge ${statusColor[Number(s.status)]}`}>{SCHOLARSHIP_STATUS[Number(s.status)]}</span></td>
                    <td><Link to={`/scholarships/${s.scholarshipId}`} className="btn btn-secondary btn-sm">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card mt-2">
        <div className="card-header"><h2>How It Works</h2><p>Every step is an immutable blockchain transaction</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem" }}>
          {[
            { icon: "📢", who: "Admin", step: "1. Announce", desc: "Posts scholarship with locked ETH funds" },
            { icon: "📝", who: "User",  step: "2. Register & Apply", desc: "User registers then submits application" },
            { icon: "✅", who: "Admin", step: "3. Approve/Reject", desc: "Admin reviews and decides on applications" },
            { icon: "💸", who: "Admin", step: "4. Disburse",  desc: "Funds sent directly to student wallet on-chain" },
          ].map(({ icon, step, desc, who }) => (
            <div key={step} style={{ padding: "1rem", borderRadius: "var(--radius)", background: "var(--bg)", textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", marginBottom: ".35rem" }}>{icon}</div>
              <div style={{ fontSize: ".7rem", color: "var(--text-muted)", marginBottom: ".2rem" }}>{who}</div>
              <div style={{ fontWeight: 600, fontSize: ".875rem", marginBottom: ".3rem" }}>{step}</div>
              <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
