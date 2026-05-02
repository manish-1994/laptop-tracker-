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
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Activity Logs</h1>

        {userRole === "super_admin" && (
          <button
            onClick={clearLogs}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Delete All Logs
          </button>
        )}
      </div>

      {/* LOG LIST */}
      <div className="bg-white rounded-xl shadow border">

        {logs.length === 0 && (
          <div className="p-6 text-gray-400 text-center">
            No logs yet
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} className="p-4 border-b text-sm">

            {/* USER */}
            <div>
              <span className="text-indigo-600 font-semibold">
                {log.user_name || "unknown"}
              </span>{" "}
              <span className="text-gray-700">
                {log.action_type || "performed action"}
              </span>{" "}
              <span className="font-semibold">
                {log.column_name || log.description || ""}
              </span>
            </div>

            {/* OLD → NEW */}
            {(log.old_value || log.new_value) && (
              <div className="text-xs mt-1">
                <span className="text-red-500">
                  {log.old_value || "-"}
                </span>
                {" → "}
                <span className="text-green-600">
                  {log.new_value || "-"}
                </span>
              </div>
            )}

            {/* TIME */}
            <div className="text-xs text-gray-400 mt-1">
              {log.created_at
                ? new Date(log.created_at).toLocaleString()
                : "No timestamp"}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}