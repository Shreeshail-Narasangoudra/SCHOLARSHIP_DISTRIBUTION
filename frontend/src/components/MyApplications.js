/* eslint-disable no-undef */
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { useWeb3, ROLES, APPLICATION_STATUS } from "../context/Web3Context";

const appStatusColor = { 0: "badge-gray", 1: "badge-blue", 2: "badge-blue", 3: "badge-red", 4: "badge-green" };
const appStatusIcon  = { 0: "📋", 1: "🔎", 2: "✅", 3: "❌", 4: "💸" };

export default function MyApplications() {
  const { contract, user, account } = useWeb3();
  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const appIds  = await contract.getUserApplications(account);
      const enriched = [];
      for (const id of appIds) {
        try {
          const a = await contract.getApplication(id);
          const s = await contract.getScholarship(a.scholarshipId);
          enriched.push({
            applicationId:    a.applicationId,
            scholarshipId:    a.scholarshipId,
            applicant:        a.applicant,
            studentId:        a.studentId,
            cgpa:             a.cgpa,
            documentRef:      a.documentRef,
            remarks:          a.remarks,
            status:           a.status,
            submittedAt:      a.submittedAt,
            reviewedAt:       a.reviewedAt,
            disbursedAt:      a.disbursedAt,
            scholarshipTitle: s.title,
            perStudentAmount: s.perStudentAmount,
          });
        } catch (e) { console.error("Error loading app", id.toString(), e); }
      }
      setApplications(enriched.reverse());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [contract, account]);

  useEffect(() => { load(); }, [load]);

  if (!user?.isRegistered || user.role !== ROLES.User) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="alert alert-danger">
            Only registered users can view applications. Use Create Account from the login page.
        </div>
      </div>
    );
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  let approved = 0, rejected = 0, disbursed = 0, submitted = 0, underReview = 0;
  let totalDisbursedWei = BigInt(0);
  applications.forEach(a => {
    const st = Number(a.status);
    if (st === 0) submitted++;
    if (st === 1) underReview++;
    if (st === 2) approved++;
    if (st === 3) rejected++;
    if (st === 4) { disbursed++; try { totalDisbursedWei += BigInt(a.perStudentAmount.toString()); } catch {} }
  });

  return (
    <div>
      <div className="page-header">
        <h1>My Applications</h1>
        <p>{user.name} · {user.institution} · Roll No: {user.studentId}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><span className="stat-label">Total Applied</span><span className="stat-value">{applications.length}</span></div>
        <div className="stat-card"><span className="stat-label">Pending</span><span className="stat-value" style={{ color: "var(--warning)" }}>{submitted + underReview}</span><span className="stat-desc">Awaiting decision</span></div>
        <div className="stat-card"><span className="stat-label">Approved</span><span className="stat-value" style={{ color: "var(--info)" }}>{approved}</span><span className="stat-desc">Awaiting disbursal</span></div>
        <div className="stat-card"><span className="stat-label">Disbursed</span><span className="stat-value" style={{ color: "var(--success)" }}>{disbursed}</span>
          <span className="stat-desc">{disbursed > 0 ? `${parseFloat(ethers.formatEther(totalDisbursedWei)).toFixed(4)} ETH received` : "No funds yet"}</span></div>
      </div>

      {applications.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No applications yet</h3>
            <p>Browse available scholarships and submit your first application.</p>
            <Link to="/scholarships" className="btn btn-primary mt-2">Browse Scholarships</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {applications.map((a, idx) => {
            const appStatus = Number(a.status);
            const appId     = a.applicationId ? a.applicationId.toString() : String(idx);
            let perEth = "0";
            try { perEth = parseFloat(ethers.formatEther(a.perStudentAmount)).toFixed(4); } catch {}

            return (
              <div key={appId} className="card" style={{
                borderLeft: `4px solid ${appStatus === 4 ? "var(--success)" : appStatus === 3 ? "var(--danger)" : appStatus === 2 ? "var(--info)" : appStatus === 1 ? "var(--info)" : "var(--border)"}`
              }}>
                <div className="flex-between" style={{ flexWrap: "wrap", gap: ".5rem", marginBottom: ".75rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>{a.scholarshipTitle || "Scholarship"}</h3>
                    <span style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>
                      Application #{appId} · Submitted {a.submittedAt ? new Date(Number(a.submittedAt) * 1000).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                    <span className={`badge ${appStatusColor[appStatus]}`}>{appStatusIcon[appStatus]} {APPLICATION_STATUS[appStatus]}</span>
                    <Link to={`/scholarships/${a.scholarshipId ? a.scholarshipId.toString() : ""}`} className="btn btn-secondary btn-sm">View Scholarship</Link>
                  </div>
                </div>

                <div className="form-row">
                  <div>
                    <div className="info-row"><span className="label">CGPA</span><span className="value">{a.cgpa || "—"}</span></div>
                    <div className="info-row"><span className="label">Scholarship Amount</span><span className="value" style={{ color: "var(--success)" }}>{perEth} ETH</span></div>
                  </div>
                  <div>
                    <div className="info-row"><span className="label">Document Ref</span><span className="value" style={{ fontSize: ".78rem" }}>{a.documentRef || "—"}</span></div>
                    {a.remarks && <div className="info-row"><span className="label">Admin Remarks</span><span className="value">{a.remarks}</span></div>}
                    {appStatus === 4 && a.disbursedAt && <div className="info-row"><span className="label">Disbursed At</span><span className="value">{new Date(Number(a.disbursedAt) * 1000).toLocaleString()}</span></div>}
                  </div>
                </div>

                {appStatus === 0 && <div className="alert alert-info" style={{ marginTop: ".75rem", marginBottom: 0 }}>📋 Submitted — awaiting admin review.</div>}
                {appStatus === 1 && <div className="alert alert-info" style={{ marginTop: ".75rem", marginBottom: 0 }}>🔎 Under review — verifier/admin is reviewing your application.</div>}
                {appStatus === 2 && <div className="alert alert-info" style={{ marginTop: ".75rem", marginBottom: 0 }}>✅ Approved! Funds will be disbursed to your wallet soon.</div>}
                {appStatus === 3 && <div className="alert alert-danger" style={{ marginTop: ".75rem", marginBottom: 0 }}>❌ Rejected.{a.remarks ? ` Reason: ${a.remarks}` : ""}</div>}
                {appStatus === 4 && <div className="alert alert-success" style={{ marginTop: ".75rem", marginBottom: 0 }}>🎉 <strong>{perEth} ETH</strong> disbursed to your wallet on {a.disbursedAt ? new Date(Number(a.disbursedAt) * 1000).toLocaleString() : "—"}. Permanently recorded on blockchain.</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
