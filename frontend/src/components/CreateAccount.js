import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

export default function CreateAccount() {
  const navigate = useNavigate();
  const { createStudentAccount, loading, error } = useWeb3();

  const [form, setForm] = useState({
    username: "",
    password: "",
    institution: "",
    studentId: "",
  });

  const handleCreate = async () => {
    // Full Name removed from UI; use username as name for on-chain registration.
    await createStudentAccount({
      ...form,
      name: String(form.username || "").trim(),
    });
    // If creation succeeds, Web3Context will connect + register on-chain.
    // App routing will automatically move into the main app.
  };

  return (
    <div className="connect-screen">
      <div className="connect-card">
        <div className="connect-logo">🎓</div>
        <h1 className="connect-title">Create Student Account</h1>
        <p className="connect-subtitle" style={{ marginBottom: "1rem" }}>
          Create login credentials and register on the blockchain.
        </p>

        <div style={{ marginBottom: "1rem", textAlign: "left" }}>
          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 600, color: "#374151", marginBottom: ".35rem" }}>
            Username
          </label>
          <input
            style={{ width: "100%", padding: ".55rem .85rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: ".875rem", background: "#fff" }}
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            placeholder="Username"
            autoComplete="username"
          />

          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 600, color: "#374151", margin: ".65rem 0 .35rem" }}>
            Password
          </label>
          <input
            type="password"
            style={{ width: "100%", padding: ".55rem .85rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: ".875rem", background: "#fff" }}
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Password"
            autoComplete="new-password"
          />

          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 600, color: "#374151", margin: ".65rem 0 .35rem" }}>
            Branch
          </label>
          <input
            style={{ width: "100%", padding: ".55rem .85rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: ".875rem", background: "#fff" }}
            value={form.institution}
            onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
            placeholder="Branch"
          />

          <label style={{ display: "block", fontSize: ".82rem", fontWeight: 600, color: "#374151", margin: ".65rem 0 .35rem" }}>
            Roll Number
          </label>
          <input
            style={{ width: "100%", padding: ".55rem .85rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: ".875rem", background: "#fff" }}
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            placeholder="Roll number"
          />
        </div>

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: ".75rem", marginBottom: "1rem", fontSize: ".82rem", color: "#991b1b", textAlign: "left" }}>
            ⚠️ {error}
          </div>
        )}

        <button
          style={{ width: "100%", padding: ".75rem", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontSize: "1rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "Creating…" : "➕ Create & Register (On-Chain)"}
        </button>

        <button
          style={{ width: "100%", padding: ".7rem", background: "transparent", color: "#1e40af", border: "1px solid #c7d2fe", borderRadius: 8, fontSize: ".95rem", fontWeight: 700, cursor: "pointer", marginTop: ".75rem" }}
          onClick={() => navigate("/")}
          type="button"
        >
          ← Back to Login
        </button>

        <div style={{ marginTop: "1rem", padding: ".75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: ".78rem", color: "#166534", textAlign: "left" }}>
          Demo-only: credentials are stored in your browser and mapped to a generated wallet.<br />
          Make sure <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>npx hardhat node</code> is running.
        </div>
      </div>
    </div>
  );
}
