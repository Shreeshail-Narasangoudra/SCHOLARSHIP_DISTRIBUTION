/* eslint-disable no-undef */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { useWeb3, ROLES } from "../context/Web3Context";

export default function CreateScholarship() {
  const { contract, user } = useWeb3();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title:                "",
    description:          "",
    perStudentEth:        "",
    deadlineDate:         "",
    maxRecipients:        "",
    criteriaInput:        "",
  });
  const [criteriaList, setCriteriaList] = useState([]);
  const [pending,      setPending]      = useState(false);

  if (!user?.isRegistered || user.role !== ROLES.Admin) {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <div className="alert alert-danger">Access denied. Admin only.</div>
      </div>
    );
  }

  const addCriteria = () => {
    const c = form.criteriaInput.trim();
    if (!c) return;
    if (criteriaList.includes(c)) { toast.warning("Criterion already added"); return; }
    setCriteriaList(prev => [...prev, c]);
    setForm(f => ({ ...f, criteriaInput: "" }));
  };

  const removeCriteria = (index) => {
    setCriteriaList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim())               { toast.warning("Title is required"); return; }
    if (!form.perStudentEth || isNaN(parseFloat(form.perStudentEth)) || parseFloat(form.perStudentEth) <= 0) {
      toast.warning("Enter a valid per-student ETH amount"); return;
    }
    if (!form.maxRecipients || parseInt(form.maxRecipients) < 1) {
      toast.warning("Enter a valid number of maximum recipients"); return;
    }
    if (!form.deadlineDate)               { toast.warning("Deadline is required"); return; }
    if (criteriaList.length === 0)        { toast.warning("Add at least one eligibility criterion"); return; }

    const deadlineTs = Math.floor(new Date(form.deadlineDate).getTime() / 1000);
    if (deadlineTs <= Math.floor(Date.now() / 1000)) {
      toast.warning("Deadline must be in the future"); return;
    }

    const perWei      = ethers.parseEther(form.perStudentEth);
    const maxRec      = BigInt(form.maxRecipients);
    const totalWei    = perWei * maxRec;
    const totalEth    = parseFloat(ethers.formatEther(totalWei)).toFixed(4);

    if (!window.confirm(
      `This will lock ${totalEth} ETH (${form.perStudentEth} × ${form.maxRecipients} recipients) in the smart contract. Continue?`
    )) return;

    setPending(true);
    try {
      const tx = await contract.announceScholarship(
        form.title,
        form.description,
        "",
        perWei,
        BigInt(deadlineTs),
        maxRec,
        criteriaList,
        { value: totalWei }
      );
      toast.info("Announcing scholarship on blockchain…");
      await tx.wait();
      toast.success("Scholarship announced successfully! 🎓");
      navigate("/scholarships");
    } catch (e) {
      toast.error(e.reason || e.message);
    } finally {
      setPending(false);
    }
  };

  const perEth  = parseFloat(form.perStudentEth) || 0;
  const maxRec  = parseInt(form.maxRecipients)  || 0;
  const totalEth = (perEth * maxRec).toFixed(4);

  return (
    <div>
      <div className="page-header">
        <h1>Announce Scholarship</h1>
        <p>Create a new scholarship on-chain. Funds are locked immediately in the smart contract.</p>
      </div>

      <div style={{ maxWidth: 680 }}>
        <div className="card">
          <div className="card-header">
            <h2>Scholarship Details</h2>
            <p>All fields are stored immutably on the Ethereum blockchain</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Scholarship Title <span>*</span></label>
              <input
                className="form-control"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Scholarship title"
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description <span>*</span></label>
              <textarea
                className="form-control"
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description"
                required
              />
            </div>

            {/* Criteria tags */}
            <div className="form-group">
              <label className="form-label">Eligibility Criteria Tags <span>*</span></label>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <input
                  className="form-control"
                  value={form.criteriaInput}
                  onChange={e => setForm(f => ({ ...f, criteriaInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCriteria(); } }}
                  placeholder="Add a criterion"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addCriteria}
                >
                  + Add
                </button>
              </div>
              <p className="form-hint">Press Enter or click Add. These are stored on-chain as structured tags.</p>
              {criteriaList.length > 0 && (
                <div className="criteria-tags" style={{ marginTop: ".5rem" }}>
                  {criteriaList.map((c, i) => (
                    <span key={i} className="criteria-tag" style={{ cursor: "pointer" }} onClick={() => removeCriteria(i)}>
                      {c} ✕
                    </span>
                  ))}
                </div>
              )}
            </div>

            <hr className="divider" />

            {/* Fund parameters */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Per-Student Amount (ETH) <span>*</span></label>
                <input
                  className="form-control"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={form.perStudentEth}
                  onChange={e => setForm(f => ({ ...f, perStudentEth: e.target.value }))}
                  placeholder="Per-student ETH"
                  required
                />
                <p className="form-hint">ETH disbursed to each approved student</p>
              </div>
              <div className="form-group">
                <label className="form-label">Maximum Recipients <span>*</span></label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={form.maxRecipients}
                  onChange={e => setForm(f => ({ ...f, maxRecipients: e.target.value }))}
                  placeholder="Max recipients"
                  required
                />
                <p className="form-hint">Cap on the number of students who can receive the scholarship</p>
              </div>
            </div>

            {perEth > 0 && maxRec > 0 && (
              <div className="alert alert-info mb-2">
                💰 Total ETH to lock in contract: <strong>{totalEth} ETH</strong>
                &nbsp;({form.perStudentEth} ETH × {maxRec} recipients)
              </div>
            )}

            {/* Deadline */}
            <div className="form-group">
              <label className="form-label">Application Deadline <span>*</span></label>
              <input
                className="form-control"
                type="datetime-local"
                value={form.deadlineDate}
                onChange={e => setForm(f => ({ ...f, deadlineDate: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
              <p className="form-hint">Students cannot apply after this timestamp (enforced by smart contract)</p>
            </div>

            <hr className="divider" />

            <div className="alert alert-warning mb-2">
              ⚠️ <strong>Important:</strong> Announcing a scholarship will immediately transfer{" "}
              <strong>{totalEth} ETH</strong> from your wallet to the smart contract.
              Funds are only refunded if the scholarship is cancelled.
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={pending}
            >
              {pending ? "Announcing on Blockchain…" : "📢 Announce Scholarship"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
