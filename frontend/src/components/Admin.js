import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3, ROLES } from "../context/Web3Context";

export default function Admin() {
  const { contract, user, account } = useWeb3();
  const [stats,   setStats]   = useState({ scholarships: 0, applications: 0, balance: "0" });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!contract) return;
    try {
      const s   = await contract.scholarshipCount();
      const a   = await contract.applicationCount();
      const bal = await contract.getContractBalance();
      setStats({ scholarships: Number(s), applications: Number(a), balance: parseFloat(ethers.formatEther(bal)).toFixed(4) });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [contract]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (!user?.isRegistered || user.role !== ROLES.Admin) {
    return <div className="card" style={{ maxWidth: 480 }}><div className="alert alert-danger">Access denied. Admin only.</div></div>;
  }

  return (
    <div>
      <div className="page-header"><h1>Admin Panel</h1><p>System administration and on-chain oversight</p></div>

      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card"><span className="stat-label">Scholarships</span><span className="stat-value">{loading ? "…" : stats.scholarships}</span><span className="stat-desc">Total announced</span></div>
        <div className="stat-card"><span className="stat-label">Applications</span><span className="stat-value" style={{ color: "var(--info)" }}>{loading ? "…" : stats.applications}</span><span className="stat-desc">Total submitted</span></div>
        <div className="stat-card"><span className="stat-label">Contract Balance</span><span className="stat-value" style={{ color: "var(--success)", fontSize: "1.3rem" }}>{loading ? "…" : stats.balance}</span><span className="stat-desc">ETH locked for disbursal</span></div>
        <div className="stat-card"><span className="stat-label">Admin Wallet</span><span style={{ fontSize: ".72rem", fontWeight: 600, wordBreak: "break-all", marginTop: ".25rem" }}>{account}</span></div>
      </div>

      {/* System info */}
      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header"><h2>System Info</h2></div>
        <div className="info-row"><span className="label">Network</span><span className="value"><span className="badge badge-teal">Hardhat Local</span></span></div>
        <div className="info-row"><span className="label">Chain ID</span><span className="value">31337</span></div>
        <div className="info-row"><span className="label">Consensus</span><span className="value">Proof of Authority (PoA)</span></div>
        <div className="info-row"><span className="label">Language</span><span className="value">Solidity ^0.8.19</span></div>
      </div>
    </div>
  );
}
