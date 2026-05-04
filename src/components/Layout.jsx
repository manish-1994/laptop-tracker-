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
    <div className="flex h-screen app-bg text-white">

      {/* SIDEBAR */}
      <div className="w-64 flex flex-col p-5 bg-[#2A1458]/80 backdrop-blur-xl border-r border-white/10 shadow-2xl">

        {/* LOGO */}
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-wide">
            Asset OS
          </h1>

          {/* USER INFO */}
          <div className="mt-5 p-4 rounded-2xl bg-[#52366B]/60 backdrop-blur-lg border border-white/10 shadow-lg">

            <div className="text-sm font-semibold">
              {user?.username || "User"}
            </div>

            <div className="text-xs text-[#F2B95E] capitalize mt-1">
              {user?.role}
            </div>

            <div className="text-[10px] text-white/60 mt-2">
              {new Date().toLocaleString()}
            </div>

          </div>
        </div>

        {/* NAV */}
        <nav className="flex flex-col gap-2">

          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-xl hover:bg-[#52366B] hover:translate-x-1 transition-all duration-200"
          >
            Dashboard
          </Link>

          {user.role === "super_admin" && (
            <Link
              to="/sheets"
              className="px-4 py-2 rounded-xl hover:bg-[#52366B] hover:translate-x-1 transition-all duration-200"
            >
              Sheets
            </Link>
          )}

          {(user.role === "user" || user.role === "admin" || user.role === "super_admin") && (
            <Link
              to="/records"
              className="px-4 py-2 rounded-xl hover:bg-[#52366B] hover:translate-x-1 transition-all duration-200"
            >
              Record Manager
            </Link>
          )}

          {(user.role === "user" ||
            user.role === "admin" ||
            user.role === "super_admin") && (
              <Link
                to="/editor"
                className="px-4 py-2 rounded-xl hover:bg-[#52366B] hover:translate-x-1 transition-all duration-200"
              >
                Record Editor
              </Link>
            )}

          {user.role === "super_admin" && (
            <Link
              to="/admin"
              className="px-4 py-2 rounded-xl hover:bg-[#52366B] hover:translate-x-1 transition-all duration-200"
            >
              Admin Panel
            </Link>
          )}

          {(user.role === "admin" || user.role === "super_admin") && (
            <Link
              to="/logs"
              className="px-4 py-2 rounded-xl hover:bg-[#52366B] hover:translate-x-1 transition-all duration-200"
            >
              Logs
            </Link>
          )}

        </nav>

        {/* LOGOUT */}
        <button
          onClick={logout}
          className="mt-auto px-4 py-2 rounded-xl bg-[#FF653F]/20 text-[#FF653F] hover:bg-[#FF653F] hover:text-white transition-all duration-200 shadow"
        >
          Logout
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-6 overflow-auto">

        <div className="glass p-6 min-h-full">
          {children}
        </div>

      </div>

    </div>
  );
}