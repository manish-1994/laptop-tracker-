import { Link, useNavigate } from "react-router-dom";

export default function Layout({ children, setUser }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  return (
    <div className="flex h-screen">

      {/* SIDEBAR */}
      <div className="w-64 bg-gray-900 text-white p-5 flex flex-col">

        <h1 className="text-xl font-bold mb-6">Asset OS</h1>

        <nav className="flex flex-col gap-3">

          {/* ✅ FIXED ROUTE */}
          <Link to="/dashboard" className="hover:text-indigo-400">
            Dashboard
          </Link>

          <Link to="/sheets" className="hover:text-indigo-400">
            Sheets
          </Link>

          {/* 👇 ADD THIS EXACTLY HERE */}
          {(user.role === "admin" || user.role === "super_admin") && (
            <Link to="/records">Record Manager</Link>
          )}


          {user.role === "super_admin" && (
            <Link to="/admin">Admin Panel</Link>
          )}


          {(user.role === "admin" || user.role === "super_admin") && (
            <Link to="/logs">Logs</Link>
          )}

          
        </nav>

        <button
          onClick={logout}
          className="mt-auto text-red-400 hover:text-red-600"
        >
          Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        {children}
      </div>

    </div>
  );
}