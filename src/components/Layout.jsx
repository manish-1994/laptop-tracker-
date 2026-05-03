import { Link, useNavigate } from "react-router-dom";

export default function Layout({ children, setUser }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  console.log("NEW LAYOUT LOADED");

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200">

      {/* SIDEBAR */}
      <div className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white p-5 flex flex-col shadow-2xl">

        {/* LOGO */}
        <div className="mb-6">

          <h1 className="text-xl font-bold">Asset OS</h1>

          {/* USER INFO */}
          <div className="mt-4 p-3 rounded-xl bg-white/10 backdrop-blur border border-white/10">

            <div className="text-sm font-semibold text-white">
              {user?.username || "User"}
            </div>

            <div className="text-xs text-indigo-300 capitalize">
              {user?.role}
            </div>

            <div className="text-[10px] text-gray-400 mt-1">
              {new Date().toLocaleString()}
            </div>

          </div>

        </div>

        <nav className="flex flex-col gap-2">

          <Link
            to="/dashboard"
            className="px-3 py-2 rounded-lg hover:bg-white/10 transition"
          >
            Dashboard
          </Link>

          {user.role === "super_admin" && (
            <Link
              to="/sheets"
              className="px-3 py-2 rounded-lg hover:bg-white/10 transition"
            >
              Sheets
            </Link>
          )}

          {(user.role === "user" || user.role === "admin" || user.role === "super_admin") && (
            <Link
              to="/records"
              className="px-3 py-2 rounded-lg hover:bg-white/10 transition"
            >
              Record Manager
            </Link>
          )}

          {(user.role === "user" ||
            user.role === "admin" ||
            user.role === "super_admin") && (
              <Link
                to="/editor"
                className="px-3 py-2 rounded-lg hover:bg-white/10 transition"
              >
                Record Editor
              </Link>
            )}

          {user.role === "super_admin" && (
            <Link
              to="/admin"
              className="px-3 py-2 rounded-lg hover:bg-white/10 transition"
            >
              Admin Panel
            </Link>
          )}

          {(user.role === "admin" || user.role === "super_admin") && (
            <Link
              to="/logs"
              className="px-3 py-2 rounded-lg hover:bg-white/10 transition"
            >
              Logs
            </Link>
          )}

        </nav>

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="mt-auto px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition"
        >
          Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white/70 backdrop-blur-xl border border-white/30 shadow-xl rounded-2xl p-6 min-h-full">
          {children}
        </div>
      </div>

    </div>
  );
}