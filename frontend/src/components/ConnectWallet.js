import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

export default function ConnectWallet() {
  const navigate = useNavigate();
  const { loginWithCredentials, loading, error, connected } = useWeb3();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="connect-screen">
      <div className="connect-card">
        <div className="connect-logo">🎓</div>
        <h1 className="connect-title">ScholarChain</h1>
        <p className="connect-subtitle">
          Blockchain-based Scholarship Distribution System.<br/>
          Transparent, tamper-proof, and fully on-chain.
        </p>

        <div className="connect-features">
          <div className="connect-feature"><span className="icon">👤</span> Admin — announces scholarships, approves, disburses funds</div>
          <div className="connect-feature"><span className="icon">🎓</span> User — registers, logs in, applies for scholarships</div>
          <div className="connect-feature"><span className="icon">🔒</span> Proof of Authority (PoA) consensus</div>
          <div className="connect-feature"><span className="icon">🔗</span> Every action recorded on blockchain</div>
        </div>

        {!connected && (
          <div style={{ marginBottom: "1rem", textAlign: "left" }}>
            <label style={{ display: "block", fontSize: ".82rem", fontWeight: 600, color: "#374151", marginBottom: ".4rem" }}>
              Username
            </label>
            <input
              style={{ width: "100%", padding: ".55rem .85rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: ".875rem", background: "#fff" }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin / student1 / student2"
              autoComplete="username"
            />

            <label style={{ display: "block", fontSize: ".82rem", fontWeight: 600, color: "#374151", margin: ".75rem 0 .4rem" }}>
              Password
            </label>
            <input
              style={{ width: "100%", padding: ".55rem .85rem", border: "1px solid #d1d5db", borderRadius: 8, fontSize: ".875rem", background: "#fff" }}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              autoComplete="current-password"
            />
          </div>
        )}

        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: ".75rem", marginBottom: "1rem", fontSize: ".82rem", color: "#991b1b", textAlign: "left" }}>
            ⚠️ {error}
          </div>
        )}

        {!connected && (
          <button
            style={{ width: "100%", padding: ".75rem", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontSize: "1rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
            onClick={() => loginWithCredentials(username, password)}
            disabled={loading}
          >
            {loading ? "Connecting…" : "🚀 Login"}
          </button>
        )}

        {!connected && (
          <button
            style={{ width: "100%", padding: ".7rem", background: "transparent", color: "#1e40af", border: "1px solid #c7d2fe", borderRadius: 8, fontSize: ".95rem", fontWeight: 700, cursor: "pointer", marginTop: ".75rem" }}
            onClick={() => navigate("/create-account")}
            type="button"
          >
            ➕ Create Account
          </button>
        )}

        <div style={{ marginTop: "1rem", padding: ".75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: ".78rem", color: "#166534", textAlign: "left" }}>
          <strong>Demo login:</strong> <span>admin/admin</span>, <span>student1/student1</span>, <span>student2/student2</span>.<br/>
          Student account creation + registration happens via a blockchain transaction (Hardhat local).<br/>
          Make sure <code style={{ background: "#dcfce7", padding: "1px 4px", borderRadius: 3 }}>npx hardhat node</code> is running first.
        </div>
      </div>
    </div>
  );
}
