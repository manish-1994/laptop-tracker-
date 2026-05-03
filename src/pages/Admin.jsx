import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const BATCH_SIZE = 500;

export default function Admin() {
  const [profile, setProfile] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [columns, setColumns] = useState([]);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const [dbSize, setDbSize] = useState("Loading...");

  const [selectedSheet, setSelectedSheet] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [chartType, setChartType] = useState("pie");
  const [users, setUsers] = useState([]);

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "user",
    username: "",
  });

  useEffect(() => {
    init();
    loadDbSize();
  loadUsers();}, []);

  // --------------------------
  // 🔥 DB SIZE
  // --------------------------
  const loadDbSize = async () => {
    const { data, error } = await supabase.rpc("get_db_size");

    if (error) {
      console.error(error);
      setDbSize("Error");
    } else {
      setDbSize(data);
    }
  };

  // --------------------------
  // INIT
  // --------------------------
  const init = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profileData);

    if (profileData?.role === "super_admin") {
      fetchSheets();
    }
  };

  const fetchSheets = async () => {
    const { data } = await supabase
      .from("sheets")
      .select("*")
      .order("id", { ascending: false });

    setSheets(data || []);
  };
  const loadUsers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("id", { ascending: false });

  if (error) console.error(error);

  setUsers(data || []);
};

  const loadColumns = async (sheetId) => {
    const { data } = await supabase
      .from("columns")
      .select("*")
      .eq("sheet_id", sheetId);

    setColumns(data || []);
  };

  const handleSheetChange = (sheetId) => {
    setSelectedSheet(sheetId);
    setSelectedColumn("");
    loadColumns(sheetId);
  };

  // --------------------------
  // DASHBOARD CONFIG
  // --------------------------
  const saveConfig = async () => {
    if (!selectedSheet || !selectedColumn) {
      alert("Select sheet & column");
      return;
    }

    await supabase
      .from("dashboard_config")
      .delete()
      .eq("sheet_id", selectedSheet);

    const { error } = await supabase.from("dashboard_config").insert({
      sheet_id: selectedSheet,
      chart_column: selectedColumn,
      chart_type: chartType,
    });

    if (error) return alert("❌ Failed");

    alert("✅ Saved");
  };

  // --------------------------
  // ✅ CREATE USER (FIXED)
  // --------------------------
const createUser = async () => {
  if (!newUser.email || !newUser.password) {
    return alert("Email & Password required");
  }

  if (newUser.role === "super_admin") {
    return alert("❌ Not allowed");
  }

  try {
    const session = await supabase.auth.getSession();

    const res = await fetch(
      "https://kxzouwsqngkngkcxhojg.supabase.co/functions/v1/manage-users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: "create",
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          username: newUser.username,
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      return alert("❌ " + data.error);
    }

    alert("✅ User created");

    setNewUser({
      email: "",
      password: "",
      role: "user",
      username: "",
    });

    loadUsers();

  } catch (err) {
    console.error(err);
    alert("❌ Failed");
  }
};


const deleteUser = async (id) => {
  if (!confirm("Delete user permanently?")) return;

  const { data } = await supabase.auth.getUser();

  if (data?.user?.id === id) {
    return alert("❌ You cannot delete yourself");
  }

  try {
    const session = await supabase.auth.getSession();

    const res = await fetch(
      "https://kxzouwsqngkngkcxhojg.supabase.co/functions/v1/manage-users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: "delete",
          userId: id,
        }),
      }
    );

    let result;
    try {
      result = await res.json();
    } catch {
      result = { error: "Invalid response from server" };
    }

    console.log("DELETE RESPONSE:", result);

    if (!res.ok || result.error) {
      return alert("❌ " + (result.error || "Delete failed"));
    }

    alert("✅ User deleted");
    loadUsers();

  } catch (err) {
    console.error(err);
    alert("❌ " + err.message);
  }
};


const updateRole = async (id, role) => {
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id);

  if (error) return alert("Failed to update role");

  loadUsers();
};

  // --------------------------
  // 🔥 DELETE ENGINE
  // --------------------------
  const deleteTableInBatches = async (table) => {
    let totalDeleted = 0;

    while (true) {
      const { data } = await supabase
        .from(table)
        .select("id")
        .limit(BATCH_SIZE);

      if (!data || data.length === 0) break;

      const ids = data.map((r) => r.id);

      const { error } = await supabase
        .from(table)
        .delete()
        .in("id", ids);

      if (error) {
        console.error(error);
        alert(`❌ Failed deleting ${table}`);
        break;
      }

      totalDeleted += ids.length;
      setProgress(`Deleting ${table}: ${totalDeleted} rows...`);
    }
  };

  const deleteAll = async () => {
    if (!confirm("⚠️ Delete EVERYTHING?")) return;

    setLoading(true);

    await deleteTableInBatches("rows");
    await deleteTableInBatches("columns");
    await deleteTableInBatches("dashboard_config");
    await deleteTableInBatches("sheets");
    await deleteTableInBatches("logs");
    await deleteTableInBatches("assets");

    setLoading(false);
    setProgress("");

    alert("✅ All data cleared");

    fetchSheets();
    loadDbSize();
  };

  const deleteSelectedSheet = async () => {
    if (!selectedSheet) return;

    if (!confirm("Delete this sheet?")) return;

    setLoading(true);

    await supabase.from("rows").delete().eq("sheet_id", selectedSheet);
    await supabase.from("columns").delete().eq("sheet_id", selectedSheet);
    await supabase.from("sheets").delete().eq("id", selectedSheet);

    setLoading(false);

    fetchSheets();
    loadDbSize();
  };

  // --------------------------
  // ACCESS CONTROL
  // --------------------------
  if (!profile) return <div className="p-6">Loading...</div>;

  if (!["admin", "super_admin"].includes(profile.role)) {
    return <div className="p-6">No access</div>;
  }

  // --------------------------
  // UI
  // --------------------------
  return (
    <div className="p-6 space-y-6">

      <h1 className="text-xl font-semibold">Admin Panel</h1>

      {/* DATABASE */}
      <div className="bg-white p-5 rounded shadow">
        <h2 className="mb-3 font-semibold">Database Usage</h2>

        <p className="text-lg">
          Used Space: <b>{dbSize}</b>
        </p>

        <p className="text-sm text-gray-500">
          Free Plan Limit: 500 MB
        </p>

        <button
          onClick={loadDbSize}
          className="mt-3 bg-indigo-600 text-white px-3 py-1 rounded"
        >
          Refresh
        </button>
      </div>

      {/* CREATE USER */}
      <div className="bg-white p-5 rounded shadow">
        <h2 className="mb-3 font-semibold">Create User</h2>

        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="Username"
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
            className="border p-2 rounded"
          />

          <input
            placeholder="Email"
            value={newUser.email}
            onChange={(e) =>
              setNewUser({ ...newUser, email: e.target.value })
            }
            className="border p-2 rounded"
          />

          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            className="border p-2 rounded"
          />

          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value })
            }
            className="border p-2 rounded"
          >
            <option value="viewer">Viewer</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          onClick={createUser}
          className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>

      <div className="bg-white p-5 rounded shadow">
  <h2 className="mb-3 font-semibold">All Users</h2>

  <table className="w-full border text-sm">
    <thead className="bg-gray-100">
      <tr>
        <th className="p-2">Username</th>
        <th className="p-2">Email</th>
        <th className="p-2">Role</th>
        <th className="p-2">User ID</th>
        <th className="p-2">Action</th>
      </tr>
    </thead>

    <tbody>
      {users
      .filter((u) => u.role !== "super_admin")
      .map((u) => (
        <tr key={u.id} className="border-t">
          <td className="p-2">{u.username}</td>
          <td className="p-2">{u.email}</td>

          <td className="p-2">
            <select
              value={u.role}
              onChange={(e) => updateRole(u.id, e.target.value)}
              className="border rounded px-1"
            >
              <option value="viewer">Viewer</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </td>

          <td className="p-2 text-xs">{u.id}</td>

          <td className="p-2">
            <button
              onClick={() => deleteUser(u.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

      {/* DASHBOARD CONFIG */}
      <div className="bg-white p-5 rounded shadow">
        <h2 className="mb-3 font-semibold">Dashboard Config</h2>

        <select
          className="border p-2 rounded w-full mb-3"
          value={selectedSheet}
          onChange={(e) => handleSheetChange(e.target.value)}
        >
          <option value="">Select Sheet</option>
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded w-full mb-3"
          value={selectedColumn}
          onChange={(e) => setSelectedColumn(e.target.value)}
        >
          <option value="">Select Column</option>
          {columns.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="border p-2 rounded w-full mb-3"
          value={chartType}
          onChange={(e) => setChartType(e.target.value)}
        >
          <option value="pie">Pie</option>
          <option value="bar">Bar</option>
        </select>

        <button
          onClick={saveConfig}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Save Chart Config
        </button>
      </div>

      {/* DELETE */}
      {profile.role === "super_admin" && (
        <div className="bg-white p-5 rounded shadow">
          <h2 className="mb-3 font-semibold">Data Control</h2>

          <select
            className="border p-2 rounded w-full mb-3"
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.target.value)}
          >
            <option value="">Select Sheet</option>
            {sheets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="flex gap-3">
            <button
              onClick={deleteSelectedSheet}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Delete Sheet
            </button>

            <button
              onClick={deleteAll}
              className="bg-red-700 text-white px-4 py-2 rounded"
            >
              Delete Everything
            </button>
          </div>

          {loading && (
            <p className="mt-3 text-gray-500">{progress}</p>
          )}
        </div>
      )}
    </div>
  );
}