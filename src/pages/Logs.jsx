import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    loadLogs();
    getUserRole();
  }, []);

  // 🔥 GET CURRENT USER ROLE (REAL WAY)
  const getUserRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserRole(data?.role || null);
    } catch (err) {
      console.error("User role fetch error:", err);
    }
  };

  // 🔥 LOAD LOGS
  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Logs fetch error:", error);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  // 🔥 DELETE ALL LOGS (SUPER ADMIN ONLY)
  const clearLogs = async () => {
    const confirmDelete = window.confirm("Delete ALL logs?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        alert("❌ Failed to delete logs");
        console.error(error);
        return;
      }

      alert("✅ Logs cleared");
      loadLogs();
    } catch (err) {
      console.error(err);
      alert("❌ Error deleting logs");
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
          Activity Logs
        </h1>

        {userRole === "super_admin" && (
          <button
            onClick={clearLogs}
            className="btn-danger"
          >
            Delete All Logs
          </button>
        )}
      </div>

      {/* LOG LIST */}
      <div className="glass p-4">

        {logs.length === 0 && (
          <div className="p-10 text-gray-400 text-center">
            No logs yet
          </div>
        )}

        <div className="relative border-l border-gray-300 ml-3 space-y-6">

          {logs.map((log) => (
            <div key={log.id} className="relative pl-6">

              {/* TIMELINE DOT */}
              <div className="absolute -left-[10px] top-2 w-4 h-4 bg-indigo-500 rounded-full shadow"></div>

              <div className="bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm hover:shadow-md transition">

                {/* USER + ACTION */}
                <div className="flex justify-between items-center text-sm">

                  {/* LEFT: USER + ROLE + ACTION */}
                  <div>
                    <span className="text-indigo-600 font-semibold">
                      {log.user_name || "unknown"}
                    </span>

                    {log.user_role && (
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                        {log.user_role}
                      </span>
                    )}

                    <span className="ml-2 text-gray-700">
                      {log.action_type || "performed action"}
                    </span>

                    <span className="ml-1 font-semibold text-gray-800">
                      {log.column_name || log.description || ""}
                    </span>
                  </div>

                  {/* RIGHT: TIME */}
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString()
                      : "No timestamp"}
                  </div>

                </div>

                {/* OLD → NEW */}
                {(log.old_value || log.new_value) && (
                  <div className="text-xs mt-2 flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-100 text-red-600 rounded">
                      {log.old_value || "-"}
                    </span>

                    <span className="text-gray-400">→</span>

                    <span className="px-2 py-1 bg-green-100 text-green-600 rounded">
                      {log.new_value || "-"}
                    </span>
                  </div>
                )}

                {/* TIME */}
                <div className="text-xs text-gray-400 mt-2">
                  {log.created_at
                    ? new Date(log.created_at).toLocaleString()
                    : "No timestamp"}
                </div>

              </div>
            </div>
          ))}

        </div>

      </div>

    </div>
  );
}