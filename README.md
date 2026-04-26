# 🎓 ScholarChain — Blockchain Scholarship Distribution Tracking System

A decentralized, tamper-proof scholarship management system built on Ethereum using **Proof of Authority (PoA)** consensus. Every stage of the scholarship lifecycle — from announcement to final fund disbursement — is recorded as an immutable on-chain transaction.

---

## 📋 Project Overview

**Problem:** Scholarship allocation in colleges suffers from limited transparency, inconsistent documentation, and the risk of unauthorized alterations or fund diversion.

**Solution:** A blockchain-based system providing:
- ✅ Immutable audit trail for every scholarship event
- ✅ Smart contract-enforced eligibility and fund release
- ✅ Tamper-proof on-chain document verification
- ✅ Unique identifiers for scholarships and beneficiaries
- ✅ Direct ETH disbursement to student wallets

---

## 🏗️ System Architecture

```
blockchain-scholarship-system/
├── contracts/
│   └── ScholarshipDistribution.sol    ← Main smart contract
├── scripts/
│   └── deploy.js                      ← Deployment script
├── test/
│   └── ScholarshipDistribution.test.js ← Hardhat test suite
├── frontend/
│   └── src/
│       ├── context/Web3Context.js     ← Ethers.js + MetaMask integration
│       ├── components/
│       │   ├── Dashboard.js           ← Stats + recent scholarships
│       │   ├── ScholarshipList.js     ← Browse all scholarships
│       │   ├── ScholarshipDetail.js   ← Apply / Review / Approve / Disburse
│       │   ├── CreateScholarship.js   ← Admin: announce scholarships
│       │   ├── MyApplications.js      ← Student: track all applications
│       │   ├── Register.js            ← Self-registration
│       │   ├── Admin.js               ← Admin panel
│       │   ├── Navbar.js
│       │   └── ConnectWallet.js
│       └── contracts/
│           ├── ScholarshipDistribution.json  ← ABI (auto-generated)
│           └── contract-address.json          ← Deployed address
├── hardhat.config.js
└── package.json
```

---

## 👥 Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | College Financial Aid Office | Announce scholarships, approve/reject applications, disburse funds, register users |
| **Student** | Applicant | Browse scholarships, submit applications with CGPA and document hashes, receive funds |

---

## 🔄 Scholarship Workflow

```
Admin                         Student
  │                              │
  │── announceScholarship         │
  │   (ETH locked on-chain)       │
  │                              │
  │                              │── applyForScholarship
  │                              │   (CGPA + doc hash)
  │                              │
  │── reviewApplication           │
  │   (score + remarks)           │
  │                              │
  │── approveApplication          │
  │   (or rejectApplication)      │
  │                              │
  │── disburseFunds ────────────► │
  │   (ETH sent to student wallet)│
  │                              │
```

---

## 🔗 Smart Contract Features

### Enumerations
- **ScholarshipStatus:** `Active → Closed → Completed | Cancelled`
- **ApplicationStatus:** `Submitted → UnderReview → Approved → Disbursed | Rejected`
- **UserRole:** `None | Admin | Student`

### Key Functions

| Function | Role | Description |
|----------|------|-------------|
| `announceScholarship(...)` | Admin | Post scholarship + lock ETH on-chain |
| `closeScholarship(id)` | Admin | Stop accepting new applications |
| `cancelScholarship(id)` | Admin | Cancel + refund unused ETH |
| `selfRegister(...)` | Student | Register wallet on blockchain |
| `registerUserByAdmin(...)` | Admin | Register users |
| `applyForScholarship(...)` | Student | Submit application with document hash |
| `reviewApplication(...)` | Admin | Assign eligibility score + remarks |
| `approveApplication(id)` | Admin | Approve application |
| `rejectApplication(id, reason)` | Admin | Reject with on-chain reason |
| `disburseFunds(id)` | Admin | Send ETH directly to student wallet |

### Events (Audit Trail)
```
UserRegistered(address, name, role)
ScholarshipAnnounced(scholarshipId, title, createdBy)
ScholarshipClosed(scholarshipId)
ScholarshipCancelled(scholarshipId)
ScholarshipCompleted(scholarshipId)
ApplicationSubmitted(applicationId, scholarshipId, applicant)
ApplicationReviewed(applicationId, score)
ApplicationApproved(applicationId, applicant)
ApplicationRejected(applicationId, applicant, reason)
FundsDisbursed(applicationId, recipient, amount)
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MetaMask](https://metamask.io/) browser extension
- npm v9+

### 1. Install Dependencies

```bash
# Root (Hardhat + smart contract tools)
npm install

# Frontend (React app)
cd frontend && npm install && cd ..
```

### 2. Start the Blockchain Node (Hardhat / PoA)

```bash
npx hardhat node
```

This starts a local Hardhat network on `http://127.0.0.1:8545` (Chain ID: 31337) simulating a Proof of Authority setup with pre-funded test accounts.

### 3. Deploy the Smart Contract

In a **new terminal**:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

This:
- Compiles `ScholarshipDistribution.sol`
- Deploys to the local Hardhat network
- Writes the ABI and contract address to `frontend/src/contracts/`

### 4. Start the Frontend

```bash
cd frontend && npm start
```

Opens at `http://localhost:3000`

### 5. Configure MetaMask

1. Add the Hardhat network:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency:** ETH

2. Import test accounts using private keys printed by `npx hardhat node`.

---

## 🧪 Running Tests

```bash
npx hardhat test
```

Test coverage includes:
- User management (self-register, admin-register, access control)
- Scholarship announcement (fund locking, ETH validation, deadline enforcement)
- Application flow (apply, review, approve, reject, disburse)
- Scholarship lifecycle (active → closed → completed / cancelled)
- Access control (role-based restrictions)

### One-Command Full Start

```bash
npm run full-start
```

Starts the node, deploys the contract, and launches the frontend in one command.

---

## 🔐 Security Features

| Feature | Implementation |
|---------|---------------|
| Duplicate prevention | `hasApplied[scholarshipId][address]` mapping |
| Recipient cap | `recipientCount < maxRecipients` enforced in smart contract |
| Fund safety | Total fund locked at announcement; only disbursed to approved students |
| Reentrancy safety | State updated before ETH transfer (checks-effects-interactions) |
| Role access | `onlyAdmin`, `onlyUser` modifiers |
| Immutable records | All events emit on-chain with timestamps |

---

## ⛓️ Consensus: Proof of Authority (PoA)

This system uses **Hardhat's local network** which simulates **Proof of Authority (Clique)** consensus:
- Pre-approved validator accounts seal blocks
- No energy-intensive mining
- Deterministic, fast block finality — ideal for institutional use
- Suitable for a college network where validators (faculty/IT) are known and trusted

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Solidity ^0.8.19 |
| Blockchain Framework | Hardhat v2 |
| Frontend | React 18 + React Router v6 |
| Web3 Library | Ethers.js v6 |
| Wallet | MetaMask |
| Notifications | React Toastify |
| Testing | Hardhat + Chai + Mocha |
| Consensus | PoA (Clique) via Hardhat |

---

## 📄 License

MIT
