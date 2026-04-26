import React, { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";
import ScholarshipABI from "../contracts/ScholarshipDistribution.json";
import contractAddressFile from "../contracts/contract-address.json";

const Web3Context = createContext(null);
export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be inside Web3Provider");
  return ctx;
};

// Only 2 roles now
export const ROLES      = { None: 0, Admin: 1, User: 2 };
export const ROLE_NAMES = ["None", "Admin", "User"];
export const SCHOLARSHIP_STATUS = ["Active", "Closed", "Completed", "Cancelled"];
export const APPLICATION_STATUS = ["Submitted", "Under Review", "Approved", "Rejected", "Disbursed"];

// Hardhat default accounts
export const HARDHAT_ACCOUNTS = [
  { label: "Account #0 — Admin (Deployer)", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" },
  { label: "Account #1 — User",             address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" },
  { label: "Account #2 — User",             address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" },
  { label: "Account #3 — User",             address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", privateKey: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" },
  { label: "Account #4 — User",             address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", privateKey: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a" },
];

// Demo credentials (maps to Hardhat accounts above)
export const DEMO_CREDENTIALS = [
  { username: "admin",    password: "admin",    accountIndex: 0 },
  { username: "student1", password: "student1", accountIndex: 1 },
  { username: "student2", password: "student2", accountIndex: 2 },
  { username: "user",     password: "user",     accountIndex: 1 },
];

const CREDENTIALS_STORAGE_KEY = "scholarchain.credentials.v1";

function loadStoredCredentials() {
  try {
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    // Normalize + de-duplicate by username (keep the latest entry)
    const seen = new Set();
    const normalizedReversed = [];
    for (let i = parsed.length - 1; i >= 0; i--) {
      const c = parsed[i] || {};
      const uname = String(c.username || "").trim().toLowerCase();
      if (!uname) continue;
      if (seen.has(uname)) continue;
      seen.add(uname);
      normalizedReversed.push({
        username: uname,
        password: typeof c.password === "string" ? c.password : String(c.password || ""),
        address: typeof c.address === "string" ? c.address : "",
        privateKey: typeof c.privateKey === "string" ? c.privateKey : "",
      });
    }
    const normalized = normalizedReversed.reverse();

    // Persist normalization if anything changed
    if (normalized.length !== parsed.length) {
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    return [];
  }
}

function saveStoredCredentials(list) {
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(list));
}

const RPC_URL          = "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = contractAddressFile.ScholarshipDistribution;

const HARDHAT_NETWORK = { name: "hardhat", chainId: 31337 };

export function Web3Provider({ children }) {
  const [account,   setAccount]   = useState(null);
  const [user,      setUser]      = useState(null);
  const [contract,  setContract]  = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const loadUser = useCallback(async (ctr, addr) => {
    try {
      const u = await ctr.users(addr);
      setUser({
        address:      addr,
        name:         u.name,
        institution:  u.institution,
        studentId:    u.studentId,
        role:         Number(u.role),
        isRegistered: u.isRegistered,
      });
    } catch (e) { console.error("loadUser", e); }
  }, []);

  const connect = useCallback(async (privateKey) => {
    setLoading(true);
    setError(null);
    try {
      // Provide a static network to avoid endless "failed to detect network" retries when node is down.
      const provider = new ethers.JsonRpcProvider(RPC_URL, HARDHAT_NETWORK);
      await provider.getBlockNumber();
      const wallet = new ethers.Wallet(privateKey, provider);
      const addr   = await wallet.getAddress();
      const ctr    = new ethers.Contract(CONTRACT_ADDRESS, ScholarshipABI.abi, wallet);
      setAccount(addr);
      setContract(ctr);
      setConnected(true);
      await loadUser(ctr, addr);
    } catch (e) {
      setError(
        e.message.includes("ECONNREFUSED") || e.message.includes("could not detect")
          ? "Cannot connect. Make sure 'npx hardhat node' is running."
          : e.message
      );
    } finally { setLoading(false); }
  }, [loadUser]);

  const loginWithCredentials = useCallback(async (username, password) => {
    const u = String(username || "").trim().toLowerCase();
    const p = String(password || "");

    // 1) Stored credentials (created via UI)
    const stored = loadStoredCredentials();
    const storedMatch = stored.find((c) => (c.username || "").toLowerCase() === u && c.password === p);
    if (storedMatch?.privateKey) {
      await connect(storedMatch.privateKey);
      return;
    }

    // 2) Demo credentials (Hardhat default accounts)
    const demoMatch = DEMO_CREDENTIALS.find(
      (c) => c.username.toLowerCase() === u && c.password === p
    );
    if (!demoMatch) {
      setError("Invalid username or password");
      return;
    }
    await connect(HARDHAT_ACCOUNTS[demoMatch.accountIndex].privateKey);
  }, [connect]);

  const createStudentAccount = useCallback(async ({ username, password, name, institution, studentId }) => {
    setLoading(true);
    setError(null);
    try {
      const u = String(username || "").trim().toLowerCase();
      const p = String(password || "");
      if (!u || !p) throw new Error("Username and password are required");
      if (!String(name || "").trim() || !String(institution || "").trim() || !String(studentId || "").trim()) {
        throw new Error("Name, institution, and roll number are required");
      }

      const stored = loadStoredCredentials();
      if (stored.some((c) => (c.username || "").toLowerCase() === u)) {
        throw new Error("Username already exists");
      }
      if (DEMO_CREDENTIALS.some((c) => c.username.toLowerCase() === u)) {
        throw new Error("Username already exists");
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL, HARDHAT_NETWORK);
      await provider.getBlockNumber();

      // Create new wallet
      const studentWallet = ethers.Wallet.createRandom().connect(provider);

      // Fund it from admin (Hardhat deployer) so it can pay gas to register.
      const adminWallet = new ethers.Wallet(HARDHAT_ACCOUNTS[0].privateKey, provider);
      const fundTx = await adminWallet.sendTransaction({
        to: await studentWallet.getAddress(),
        value: ethers.parseEther("1"),
      });
      await fundTx.wait();

      // Connect app with new student wallet
      const ctr = new ethers.Contract(CONTRACT_ADDRESS, ScholarshipABI.abi, studentWallet);
      const addr = await studentWallet.getAddress();
      setAccount(addr);
      setContract(ctr);
      setConnected(true);

      // Register on-chain
      const regTx = await ctr.register(String(name).trim(), String(institution).trim(), String(studentId).trim());
      await regTx.wait();
      await loadUser(ctr, addr);

      // Persist credentials (demo only)
      const updated = [...stored, { username: u, password: p, address: addr, privateKey: studentWallet.privateKey }];
      saveStoredCredentials(updated);
    } catch (e) {
      setError(
        e.message.includes("ECONNREFUSED") || e.message.includes("could not detect")
          ? "Cannot connect. Make sure 'npx hardhat node' is running."
          : (e.reason || e.message)
      );
    } finally {
      setLoading(false);
    }
  }, [loadUser]);

  const refreshUser = useCallback(async () => {
    if (contract && account) await loadUser(contract, account);
  }, [contract, account, loadUser]);

  const disconnect = useCallback(() => {
    setAccount(null); setUser(null);
    setContract(null); setConnected(false); setError(null);
  }, []);

  return (
    <Web3Context.Provider value={{ contract, account, user, connected, loading, error, connect, loginWithCredentials, createStudentAccount, disconnect, refreshUser, CONTRACT_ADDRESS }}>
      {children}
    </Web3Context.Provider>
  );
}
