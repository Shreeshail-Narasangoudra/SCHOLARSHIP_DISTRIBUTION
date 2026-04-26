import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

import { Web3Provider, useWeb3 } from "./context/Web3Context";
import Navbar             from "./components/Navbar";
import ConnectWallet      from "./components/ConnectWallet";
import CreateAccount      from "./components/CreateAccount";
import Dashboard          from "./components/Dashboard";
import ScholarshipList    from "./components/ScholarshipList";
import ScholarshipDetail  from "./components/ScholarshipDetail";
import CreateScholarship  from "./components/CreateScholarship";
import MyApplications     from "./components/MyApplications";
import Admin              from "./components/Admin";

function AppRoutes() {
  const { connected, loading, user } = useWeb3();

  if (loading) return (
    <div className="spinner-wrap" style={{ minHeight: "100vh" }}>
      <div className="spinner" />
    </div>
  );

  // Auth/registration gate: allow only Login + Create Account pages.
  // After connecting, wait for user profile to load.
  const loadingUserProfile = connected && user == null;
  const needsRegistration = connected && user?.isRegistered === false && user?.role !== 1;
  if (!connected || loadingUserProfile || needsRegistration) {
    if (loadingUserProfile) {
      return (
        <div className="spinner-wrap" style={{ minHeight: "100vh" }}>
          <div className="spinner" />
        </div>
      );
    }

    return (
      <Routes>
        <Route path="/" element={<ConnectWallet />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"                      element={<Dashboard />} />
          <Route path="/scholarships"          element={<ScholarshipList />} />
          <Route path="/scholarships/:id"      element={<ScholarshipDetail />} />
          <Route path="/create-scholarship"    element={<CreateScholarship />} />
          <Route path="/my-applications"       element={<MyApplications />} />
          <Route path="/admin"                 element={<Admin />} />
          <Route path="*"                      element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer position="bottom-right" theme="colored" autoClose={4000} />
      </BrowserRouter>
    </Web3Provider>
  );
}
