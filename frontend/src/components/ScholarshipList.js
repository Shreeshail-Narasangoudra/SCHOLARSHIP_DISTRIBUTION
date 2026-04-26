import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWeb3, ROLES, SCHOLARSHIP_STATUS } from "../context/Web3Context";

const statusColor  = { 0: "badge-blue", 1: "badge-yellow", 2: "badge-green", 3: "badge-red" };
const statusFilter = ["All", "Active", "Closed", "Completed", "Cancelled"];

export default function ScholarshipList() {
  const { contract, user } = useWeb3();
  const [scholarships, setScholarships] = useState([]);
  const [filter,       setFilter]       = useState("All");
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!contract) return;
    (async () => {
      try {
        const ids  = await contract.getAllScholarshipIds();
        const list = await Promise.all(ids.map(id => contract.getScholarship(id)));
        setScholarships([...list].reverse());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [contract]);

  const filtered = filter === "All"
    ? scholarships
    : scholarships.filter(s => SCHOLARSHIP_STATUS[Number(s.status)] === filter);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>Scholarships</h1>
          <p>{scholarships.length} scholarship(s) recorded on blockchain</p>
        </div>
        {user?.role === ROLES.Admin && (
          <Link to="/create-scholarship" className="btn btn-primary">
            📢 Announce New
          </Link>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap mb-2">
        {statusFilter.map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No scholarships found</h3>
            <p>
              {filter !== "All"
                ? `No ${filter.toLowerCase()} scholarships at the moment.`
                : "No scholarships have been announced yet."
              }
            </p>
            {user?.role === ROLES.Admin && (
              <Link to="/create-scholarship" className="btn btn-primary mt-2">
                Announce First Scholarship
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="scholarship-grid">
          {filtered.map(s => {
            const perEth     = parseFloat(ethers.formatEther(s.perStudentAmount)).toFixed(3);
            const totalEth   = parseFloat(ethers.formatEther(s.totalFund)).toFixed(3);
            const deadline   = new Date(Number(s.deadline) * 1000);
            const isExpired  = deadline < new Date();
            const recipients = `${s.recipientCount.toString()} / ${s.maxRecipients.toString()}`;

            return (
              <div key={s.scholarshipId.toString()} className="scholarship-card">
                <div className="flex-between">
                  <span className={`badge ${statusColor[Number(s.status)]}`}>
                    {SCHOLARSHIP_STATUS[Number(s.status)]}
                  </span>
                  <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                    #{s.scholarshipId.toString()}
                  </span>
                </div>

                <h3>{s.title}</h3>

                <p style={{ fontSize: ".82rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {s.description.length > 100 ? s.description.slice(0, 100) + "…" : s.description}
                </p>

                <div className="amount">💰 {perEth} ETH / student</div>

                <div className="meta">
                  <span>🏦 Total: {totalEth} ETH</span>
                  <span>👥 {recipients} recipients</span>
                </div>

                <div className="meta">
                  <span style={{ color: isExpired ? "var(--danger)" : "var(--text-muted)" }}>
                    🗓 {isExpired ? "Expired: " : "Deadline: "}{deadline.toLocaleDateString()}
                  </span>
                </div>

                <div style={{ marginTop: ".5rem" }}>
                  <Link
                    to={`/scholarships/${s.scholarshipId}`}
                    className="btn btn-secondary btn-sm btn-block"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
