import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useWeb3, ROLE_NAMES, ROLES } from "../context/Web3Context";

export default function Register() {
  const { contract, user, refreshUser, account } = useWeb3();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", institution: "", studentId: "" });
  const [pending, setPending] = useState(false);

  if (user?.isRegistered) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div className="card">
          <div className="card-header"><h2>Already Registered</h2></div>
          <div className="alert alert-success">
            You are registered as <strong>{ROLE_NAMES[user.role]}</strong>.<br />
            Name: {user.name}<br />
            Institution: {user.institution}<br />
            {user.studentId && <>Student ID: {user.studentId}</>}
          </div>
          <button className="btn btn-primary mt-2" onClick={() => navigate("/")}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  if (user?.role === ROLES.Admin) {
    return (
      <div style={{ maxWidth: 480 }}>
        <div className="card">
          <div className="alert alert-info">You are already logged in as Admin.</div>
          <button className="btn btn-primary mt-2" onClick={() => navigate("/")}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.institution.trim() || !form.studentId.trim()) {
      toast.warning("Please fill in all fields");
      return;
    }
    setPending(true);
    try {
      const tx = await contract.register(form.name, form.institution, form.studentId);
      toast.info("Registering on blockchain…");
      await tx.wait();
      await refreshUser();
      toast.success("Registered successfully! You can now apply for scholarships.");
      navigate("/");
    } catch (e) { toast.error(e.reason || e.message); }
    finally { setPending(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>User Registration</h1>
        <p>Register your account on the blockchain to apply for scholarships.</p>
      </div>

      <div style={{ maxWidth: 520 }}>
        <div className="card">
          <div className="card-header">
            <h2>Create Your Profile</h2>
            <p>Wallet: <code style={{ fontSize: ".8rem", background: "#f1f5f9", padding: ".15rem .4rem", borderRadius: 4 }}>{account}</code></p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name <span>*</span></label>
              <input className="form-control" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Priya Sharma" required />
            </div>

            <div className="form-group">
              <label className="form-label">College / Institution <span>*</span></label>
              <input className="form-control" value={form.institution}
                onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
                placeholder="e.g. IIT Madras — Computer Science" required />
            </div>

            <div className="form-group">
              <label className="form-label">Student / Roll Number <span>*</span></label>
              <input className="form-control" value={form.studentId}
                onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                placeholder="e.g. CS21B001" required />
              <p className="form-hint">Your unique roll number — stored permanently on the blockchain as your identifier.</p>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={pending}>
              {pending ? "Registering on Blockchain…" : "Register Now"}
            </button>
          </form>
        </div>

        <div className="alert alert-info mt-2">
          ✅ Once registered, you can browse active scholarships and submit applications.<br />
          Your registration is permanently stored on-chain and cannot be altered.
        </div>
      </div>
    </div>
  );
}
