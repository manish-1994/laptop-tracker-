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
  <div className="p-6 space-y-6 text-white">

    {/* HEADER */}
    <div className="flex justify-between items-center">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF653F] to-[#F2B95E] text-transparent bg-clip-text">
        Activity Logs
      </h1>

      {userRole === "super_admin" && (
        <button
          onClick={clearLogs}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white shadow hover:scale-105 transition"
        >
          Delete All Logs
        </button>
      )}
    </div>

    {/* LOG LIST */}
    <div className="bg-[#2A1458]/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">

      {logs.length === 0 && (
        <div className="p-10 text-white/40 text-center">
          No logs yet
        </div>
      )}

      <div className="relative border-l border-white/20 ml-3 space-y-6">

        {logs.map((log) => (
          <div key={log.id} className="relative pl-6">

            {/* TIMELINE DOT */}
            <div className="absolute -left-[10px] top-2 w-4 h-4 bg-gradient-to-r from-[#FF653F] to-[#F2B95E] rounded-full shadow"></div>

            <div className="bg-[#2A1458]/60 backdrop-blur rounded-xl p-4 shadow hover:shadow-lg transition border border-white/10">

              {/* USER + ACTION */}
              <div className="flex justify-between items-start text-sm gap-4">

                {/* LEFT */}
                <div className="flex flex-wrap items-center gap-2">

                  <span className="text-[#FF653F] font-semibold">
                    {log.user_name || "unknown"}
                  </span>

                  {log.user_role && (
                    <span className="text-xs bg-[#52366B] text-white px-2 py-0.5 rounded">
                      {log.user_role}
                    </span>
                  )}

                  <span className="text-white/70">
                    {log.action_type || "performed action"}
                  </span>

                  <span className="font-semibold text-white">
                    {log.column_name || log.description || ""}
                  </span>

                </div>

                {/* TIME */}
                <div className="text-xs text-white/50 whitespace-nowrap">
                  {log.created_at
                    ? new Date(log.created_at).toLocaleString()
                    : "No timestamp"}
                </div>

              </div>

              {/* OLD → NEW */}
              {(log.old_value || log.new_value) && (
                <div className="text-xs mt-3 flex items-center gap-2 flex-wrap">

                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">
                    {log.old_value || "-"}
                  </span>

                  <span className="text-white/40">→</span>

                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                    {log.new_value || "-"}
                  </span>

                </div>
              )}

            </div>
          </div>
        ))}

      </div>

    </div>

  </div>
);
}