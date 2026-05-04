import { Routes, Route, Navigate } from "react-router-dom";
import RecordEditor from "./pages/RecordEditor";
import { useEffect, useState } from "react";
import RecordManager from "./pages/RecordManager";
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



        {user.role === "super_admin" && (
          <Route path="/sheets" element={<Sheets />} />
        )}

        {(user.role === "user" ||
          user.role === "admin" ||
          user.role === "super_admin") && (
            <Route path="/editor" element={<RecordEditor />} />
          )}

        {(user.role === "user" ||
          user.role === "admin" ||
          user.role === "super_admin") && (
            <Route path="/records" element={<RecordManager />} />
          )}

        {(user.role === "admin" || user.role === "super_admin") && (
          <Route path="/records" element={<RecordManager />} />
        )}

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