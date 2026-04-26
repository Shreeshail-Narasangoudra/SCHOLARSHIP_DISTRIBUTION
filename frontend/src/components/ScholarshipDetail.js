/* eslint-disable no-undef */
import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWeb3, ROLES, SCHOLARSHIP_STATUS, APPLICATION_STATUS } from "../context/Web3Context";

const schColor = { 0: "badge-blue", 1: "badge-yellow", 2: "badge-green", 3: "badge-red" };
const appColor = { 0: "badge-gray", 1: "badge-blue", 2: "badge-blue", 3: "badge-red", 4: "badge-green" };

export default function ScholarshipDetail() {
  const { id } = useParams();
  const { contract, user, account } = useWeb3();

  const [scholarship,  setScholarship]  = useState(null);
  const [applications, setApplications] = useState([]);
  const [myApp,        setMyApp]        = useState(null);
  const [criteria,     setCriteria]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [pending,      setPending]      = useState(false);

  // Apply form
  const [applyForm, setApplyForm] = useState({ cgpa: "", documentRef: "" });
  // Approve remarks per app
  const [approveRemarks, setApproveRemarks] = useState({});
  // Reject reason per app
  const [rejectReason, setRejectReason] = useState({});

  const load = useCallback(async () => {
    if (!contract) return;
    try {
      const s    = await contract.getScholarship(id);
      const crit = await contract.getScholarshipCriteria(id);
      setScholarship(s);
      setCriteria(crit);

      const appIds = await contract.getScholarshipApplications(id);
      const apps = [];
      for (const aid of appIds) {
        try {
          const a = await contract.getApplication(aid);
          let applicantName = "", applicantInstitution = "", applicantStudentId = "";
          try {
            const u = await contract.users(a.applicant);
            applicantName = u.name;
            applicantInstitution = u.institution;
            applicantStudentId = u.studentId;
          } catch {}
          apps.push({
            applicationId: a.applicationId,
            scholarshipId: a.scholarshipId,
            applicant: a.applicant,
            studentId: a.studentId || applicantStudentId,
            cgpa: a.cgpa,
            documentRef: a.documentRef,
            remarks: a.remarks,
            status: a.status,
            submittedAt: a.submittedAt,
            reviewedAt: a.reviewedAt,
            disbursedAt: a.disbursedAt,
            applicantName,
            applicantInstitution,
          });
        } catch {}
      }
      setApplications(apps);

      if (account) {
        const mine = apps.find(a => a.applicant.toLowerCase() === account.toLowerCase());
        setMyApp(mine || null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [contract, id, account]);

  useEffect(() => { load(); }, [load]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.cgpa.trim() || !applyForm.documentRef.trim()) {
      toast.warning("Please fill in all fields"); return;
    }
    setPending(true);
    try {
      const tx = await contract.applyForScholarship(id, applyForm.cgpa, applyForm.documentRef);
      toast.info("Submitting application on blockchain…");
      await tx.wait();
      toast.success("Application submitted!");
      setApplyForm({ cgpa: "", documentRef: "" });
      await load();
    } catch (e) { toast.error(e.reason || e.message); }
    finally { setPending(false); }
  };

  const handleApprove = async (appId) => {
    setPending(true);
    try {
      const tx = await contract.approveApplication(appId);
      toast.info("Approving…");
      await tx.wait();
      toast.success("Application approved!");
      await load();
    } catch (e) { toast.error(e.reason || e.message); }
    finally { setPending(false); }
  };

  const handleReject = async (appId) => {
    const reason = rejectReason[appId.toString()] || "";
    if (!reason.trim()) { toast.warning("Enter a rejection reason"); return; }
    setPending(true);
    try {
      const tx = await contract.rejectApplication(appId, reason);
      toast.info("Rejecting…");
      await tx.wait();
      toast.success("Application rejected.");
      await load();
    } catch (e) { toast.error(e.reason || e.message); }
    finally { setPending(false); }
  };

  const handleDisburse = async (appId) => {
    setPending(true);
    try {
      const tx = await contract.disburseFunds(appId);
      toast.info("Disbursing funds…");
      await tx.wait();
      toast.success("Funds disbursed to student wallet! 🎉");
      await load();
    } catch (e) { toast.error(e.reason || e.message); }
    finally { setPending(false); }
  };

  const handleClose = async () => {
    setPending(true);
    try {
      const tx = await contract.closeScholarship(id);
      await tx.wait();
      toast.success("Scholarship closed.");
      await load();
    } catch (e) { toast.error(e.reason || e.message); }
    finally { setPending(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this scholarship? Unused funds will be refunded.")) return;
    setPending(true);
    try {
      const tx = await contract.cancelScholarship(id);
      await tx.wait();
      toast.success("Scholarship cancelled.");
      await load();
    } catch (e) { toast.error(e.reason || e.message); }
    finally { setPending(false); }
  };

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;
  if (!scholarship || scholarship.scholarshipId.toString() === "0")
    return <div className="card"><div className="alert alert-danger">Scholarship not found.</div></div>;

  const status    = Number(scholarship.status);
  const isActive  = status === 0;
  const isAdmin   = user?.role === ROLES.Admin;
  const isUser    = user?.role === ROLES.User;
  const deadline  = new Date(Number(scholarship.deadline) * 1000);
  const expired   = deadline < new Date();
  const perEth    = parseFloat(ethers.formatEther(scholarship.perStudentAmount)).toFixed(4);
  const totalEth  = parseFloat(ethers.formatEther(scholarship.totalFund)).toFixed(4);
  const canApply  = isUser && isActive && !expired && !myApp && user?.isRegistered;

  return (
    <div>
      <div className="page-header flex-between" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", gap: ".75rem", alignItems: "center", marginBottom: ".25rem" }}>
            <span className={`badge ${schColor[status]}`}>{SCHOLARSHIP_STATUS[status]}</span>
            <span style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>#{scholarship.scholarshipId.toString()}</span>
          </div>
          <h1>{scholarship.title}</h1>
          <p>Created {new Date(Number(scholarship.createdAt) * 1000).toLocaleString()}</p>
        </div>
        <Link to="/scholarships" className="btn btn-secondary">← Back</Link>
      </div>

      <div className="form-row" style={{ alignItems: "flex-start", marginBottom: "1.25rem" }}>
        {/* Details */}
        <div className="card">
          <div className="card-header"><h2>Scholarship Details</h2></div>
          <div className="info-row"><span className="label">Per Student</span>
            <span className="value" style={{ color: "var(--success)", fontSize: "1.1rem" }}>{perEth} ETH</span></div>
          <div className="info-row"><span className="label">Total Fund Locked</span><span className="value">{totalEth} ETH</span></div>
          <div className="info-row"><span className="label">Max Recipients</span><span className="value">{scholarship.maxRecipients.toString()}</span></div>
          <div className="info-row"><span className="label">Approved / Disbursed</span>
            <span className="value">{scholarship.recipientCount.toString()} approved · {scholarship.disbursedCount.toString()} disbursed</span></div>
          <div className="info-row"><span className="label">Deadline</span>
            <span className="value" style={{ color: expired ? "var(--danger)" : "var(--text)" }}>
              {deadline.toLocaleString()}{expired && " (Expired)"}
            </span></div>
          <div className="info-row"><span className="label">Applications</span><span className="value">{applications.length}</span></div>
          <hr className="divider" />
          <p style={{ fontSize: ".875rem", lineHeight: 1.6 }}>{scholarship.description}</p>
          {criteria.length > 0 && (
            <>
              <hr className="divider" />
              <div style={{ fontWeight: 600, marginBottom: ".5rem", fontSize: ".875rem" }}>Eligibility Criteria</div>
              <div className="criteria-tags">{criteria.map((c, i) => <span key={i} className="criteria-tag">{c}</span>)}</div>
            </>
          )}
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <div className="card">
            <div className="card-header"><h2>Admin Controls</h2></div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".65rem" }}>
              {isActive && <button className="btn btn-warning btn-block" onClick={handleClose} disabled={pending}>🔒 Close Applications</button>}
              {(status === 0 || status === 1) && <button className="btn btn-danger btn-block" onClick={handleCancel} disabled={pending}>✕ Cancel Scholarship</button>}
              {status === 2 && <div className="alert alert-success" style={{ marginBottom: 0 }}>✅ All recipients disbursed.</div>}
              {status === 3 && <div className="alert alert-danger" style={{ marginBottom: 0 }}>This scholarship was cancelled.</div>}
            </div>
          </div>
        )}
      </div>

      {/* User: My application status */}
      {isUser && myApp && (
        <div className="card mb-2" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="card-header"><h2>Your Application</h2><p>Application #{myApp.applicationId.toString()}</p></div>
          <div className="info-row"><span className="label">Status</span>
            <span className="value"><span className={`badge ${appColor[Number(myApp.status)]}`}>{APPLICATION_STATUS[Number(myApp.status)]}</span></span></div>
          <div className="info-row"><span className="label">CGPA</span><span className="value">{myApp.cgpa}</span></div>
          <div className="info-row"><span className="label">Document Ref</span><span className="value" style={{ fontSize: ".78rem" }}>{myApp.documentRef}</span></div>
          {myApp.remarks && <div className="info-row"><span className="label">Remarks from Admin</span><span className="value">{myApp.remarks}</span></div>}
          {Number(myApp.status) === 4 && (
            <div className="alert alert-success mt-2">
              🎉 {perEth} ETH has been disbursed to your wallet on {new Date(Number(myApp.disbursedAt) * 1000).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* User: Apply form */}
      {canApply && (
        <div className="card mb-2">
          <div className="card-header"><h2>Apply for This Scholarship</h2></div>
          <form onSubmit={handleApply}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Your CGPA <span>*</span></label>
                <input className="form-control" value={applyForm.cgpa}
                  onChange={e => setApplyForm(f => ({ ...f, cgpa: e.target.value }))}
                  placeholder="e.g. 8.75" required />
              </div>
              <div className="form-group">
                <label className="form-label">Document Reference <span>*</span></label>
                <input className="form-control" value={applyForm.documentRef}
                  onChange={e => setApplyForm(f => ({ ...f, documentRef: e.target.value }))}
                  placeholder="e.g. MARKSHEET_2024 or any reference ID" required />
                <p className="form-hint">Enter any reference ID for your supporting documents (marksheet, income certificate etc.)</p>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
              {pending ? "Submitting…" : "📝 Submit Application"}
            </button>
          </form>
        </div>
      )}

      {isUser && !user?.isRegistered && (
        <div className="alert alert-warning mb-2">Use Create Account from the login page to apply for this scholarship.</div>
      )}

      {/* Admin: Applications table */}
      {isAdmin && (
        <div className="card">
          <div className="card-header"><h2>Applications ({applications.length})</h2><p>Review, approve and disburse funds</p></div>
          {applications.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📭</div><h3>No applications yet</h3></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>App #</th><th>Student</th><th>Roll No.</th><th>CGPA</th><th>Doc Ref</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {applications.map(a => {
                    const appStatus = Number(a.status);
                    const appId = a.applicationId;
                    const appIdStr = appId.toString();
                    return (
                      <tr key={appIdStr}>
                        <td>#{appIdStr}</td>
                        <td>
                          <strong>{a.applicantName || "Unknown"}</strong>
                          <div style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>{a.applicant.slice(0,8)}…</div>
                        </td>
                        <td>{a.studentId}</td>
                        <td>{a.cgpa}</td>
                        <td style={{ fontSize: ".78rem", maxWidth: 120, wordBreak: "break-all" }}>{a.documentRef}</td>
                        <td><span className={`badge ${appColor[appStatus]}`}>{APPLICATION_STATUS[appStatus]}</span></td>
                        <td style={{ fontSize: ".78rem" }}>{new Date(Number(a.submittedAt) * 1000).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem", minWidth: 200 }}>
                            {/* Approve */}
                            {(appStatus === 0 || appStatus === 1) && (
                              <div style={{ display: "flex", gap: ".4rem" }}>
                                <input className="form-control" style={{ padding: ".3rem .5rem", fontSize: ".8rem" }}
                                  placeholder="Remarks (optional)"
                                  value={approveRemarks[appIdStr] || ""}
                                  onChange={e => setApproveRemarks(p => ({ ...p, [appIdStr]: e.target.value }))} />
                                <button className="btn btn-success btn-sm" disabled={pending} onClick={() => handleApprove(appId)}>✓ Approve</button>
                              </div>
                            )}
                            {/* Reject */}
                            {(appStatus === 0 || appStatus === 1) && (
                              <div style={{ display: "flex", gap: ".4rem" }}>
                                <input className="form-control" style={{ padding: ".3rem .5rem", fontSize: ".8rem" }}
                                  placeholder="Rejection reason *"
                                  value={rejectReason[appIdStr] || ""}
                                  onChange={e => setRejectReason(p => ({ ...p, [appIdStr]: e.target.value }))} />
                                <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => handleReject(appId)}>✕</button>
                              </div>
                            )}
                            {/* Disburse */}
                            {appStatus === 2 && (
                              <button className="btn btn-success btn-sm" disabled={pending} onClick={() => handleDisburse(appId)}>
                                💸 Disburse {perEth} ETH
                              </button>
                            )}
                            {appStatus === 3 && <span style={{ fontSize: ".78rem", color: "var(--danger)" }}>Rejected: {a.remarks}</span>}
                            {appStatus === 4 && <span style={{ fontSize: ".78rem", color: "var(--success)", fontWeight: 600 }}>✅ Disbursed {new Date(Number(a.disbursedAt) * 1000).toLocaleDateString()}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
