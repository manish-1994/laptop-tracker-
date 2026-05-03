import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sheets from "./pages/Sheets";
import Admin from "./pages/Admin";
import Logs from "./pages/Logs";

import Layout from "./components/Layout";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  // 🔐 NOT LOGGED IN
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login setUser={setUser} />} />
      </Routes>
    );
  }

  // ✅ LOGGED IN
  return (
    <Layout setUser={setUser}>
      <Routes>

  {/* 🔥 DEFAULT REDIRECT */}
  <Route path="/" element={<Navigate to="/dashboard" />} />

  {/* 🔥 DASHBOARD */}
  <Route path="/dashboard" element={<Dashboard />} />

  {/* SHEETS */}
  <Route path="/sheets" element={<Sheets />} />

  {/* 🔒 ROLE BASED */}
 // 🔒 ONLY SUPER ADMIN CAN ACCESS ADMIN PANEL
{user.role === "super_admin" && (
  <Route path="/admin" element={<Admin />} />
)}

// 🔥 ADMIN + SUPER ADMIN CAN ACCESS LOGS
{(user.role === "admin" || user.role === "super_admin") && (
  <Route path="/logs" element={<Logs />} />
)}

  {user.role === "super_admin" && (
    <Route path="/logs" element={<Logs />} />
  )}

  {/* FALLBACK */}
  <Route path="*" element={<Navigate to="/dashboard" />} />

</Routes>
    </Layout>
  );
}