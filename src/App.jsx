import { Routes, Route, Navigate } from "react-router-dom";
import RecordEditor from "./pages/RecordEditor";
import { useEffect, useState } from "react";
import RecordManager from "./pages/RecordManager";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sheets from "./pages/Sheets";
import Admin from "./pages/Admin";
import Logs from "./pages/Logs";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  return (
    <>
      {/* ✅ ALWAYS AVAILABLE */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#2A1458",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "10px 14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          },
          success: {
            iconTheme: {
              primary: "#F2B95E",
              secondary: "#2A1458",
            },
          },
          error: {
            iconTheme: {
              primary: "#FF653F",
              secondary: "#2A1458",
            },
          },
        }}
      />

      {!user ? (
        <Routes>
          <Route path="*" element={<Login setUser={setUser} />} />
        </Routes>
      ) : (
        <Layout setUser={setUser}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sheets" element={<Sheets />} />

            {(user.role === "user" ||
              user.role === "admin" ||
              user.role === "super_admin") && (
              <>
                <Route path="/editor" element={<RecordEditor />} />
                <Route path="/records" element={<RecordManager />} />
              </>
            )}

            {user.role === "super_admin" && (
              <Route path="/admin" element={<Admin />} />
            )}

            {(user.role === "admin" || user.role === "super_admin") && (
              <Route path="/logs" element={<Logs />} />
            )}

            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Layout>
      )}
    </>
  );
}