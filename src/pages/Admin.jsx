import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";

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
    loadUsers();
  }, []);

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
      .eq("sheet_id", sheetId)
      .order("position", { ascending: true });

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
      toast.error("Select sheet & column");
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

    if (error) {
      toast.error("Failed ❌");
      return;
    }

    toast.success("Config saved ✅");
  };

  const deleteChartConfig = async () => {

    if (!selectedSheet) {
      toast.error("Select a sheet first ❌");
      return;
    }

    const confirmed = await new Promise((resolve) => {

      toast((t) => (
        <div className="flex flex-col gap-3">

          <span className="text-sm">
            Delete chart configuration?
          </span>

          <div className="flex justify-end gap-2">

            <button
              className="px-3 py-1 rounded bg-white/10 text-white"
              onClick={() => {
                toast.dismiss(t.id);
                toast("Delete cancelled");
                resolve(false);
              }}
            >
              Cancel
            </button>

            <button
              className="px-3 py-1 rounded bg-red-500 text-white"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              Delete
            </button>

          </div>
        </div>
      ));

    });

    if (!confirmed) return;

    const t = toast.loading("Deleting config...");

    const { error } = await supabase
      .from("dashboard_config")
      .delete()
      .eq("sheet_id", selectedSheet);

    if (error) {
      toast.error("Failed to delete config ❌", { id: t });
      return;
    }

    toast.success("Chart config deleted 🗑", { id: t });

    setSelectedColumn("");
    setChartType("pie");
  };

  // --------------------------
  // ✅ CREATE USER (FIXED)
  // --------------------------
  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error("Email & Password required");
      return;
    }

    if (newUser.role === "super_admin") {
      toast.error("Not allowed ❌");
      return;
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
        toast.error("❌ " + data.error);
        return;
      }

      toast.success("User created ✅");

      setNewUser({
        email: "",
        password: "",
        role: "user",
        username: "",
      });

      loadUsers();

    } catch (err) {
      console.error(err);
      toast.error("Failed ❌");
    }
  };


  const deleteUser = async (id) => {
    return new Promise((resolve) => {

      toast((t) => (
        <div className="flex flex-col gap-3">

          <span className="text-sm">
            Delete user permanently?
          </span>

          <div className="flex justify-end gap-2">

            <button
              className="px-3 py-1 rounded bg-white/10 text-white"
              onClick={() => {
                toast.dismiss(t.id);
                toast("Delete cancelled");
                resolve(false);
              }}
            >
              Cancel
            </button>

            <button
              className="px-3 py-1 rounded bg-red-500 text-white"
              onClick={async () => {

                toast.dismiss(t.id);

                const loadingToast = toast.loading("Deleting user...");

                const { data } = await supabase.auth.getUser();

                if (data?.user?.id === id) {
                  toast.error("❌ You cannot delete yourself", {
                    id: loadingToast,
                  });
                  resolve(false);
                  return;
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

                  const result = await res.json();

                  if (!res.ok || result.error) {
                    toast.error("Delete failed ❌", {
                      id: loadingToast,
                    });
                    resolve(false);
                    return;
                  }

                  toast.success("User deleted 🗑", {
                    id: loadingToast,
                  });

                  loadUsers();

                  resolve(true);

                } catch (err) {
                  toast.error("❌ " + err.message, {
                    id: loadingToast,
                  });

                  resolve(false);
                }
              }}
            >
              Delete
            </button>

          </div>
        </div>
      ));

    });
  };


  const updateRole = async (id, role) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update role ❌");
      return;
    }

    toast.success("Role updated ✅");
    loadUsers(); // 🔥 THIS WAS MISSING
  };
  // --------------------------
  // 🔥 DELETE ENGINE
  // --------------------------
  const deleteTableInBatches = async (table, updateToast) => {
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
        toast.error(`Failed deleting ${table} ❌`); break;
      }

      // ✅ AFTER SUCCESSFUL DELETE
      totalDeleted += ids.length;

      // ✅ CREATE MESSAGE
      const msg = `Deleting ${table}: ${totalDeleted} rows...`;

      // ✅ UPDATE UI TEXT (your existing)
      setProgress(msg);

      // 🔥 THIS IS THE IMPORTANT LINE (RIGHT HERE)
      if (updateToast) updateToast(msg);
    }
  };

  const deleteAll = async () => {

    const confirmed = await new Promise((resolve) => {

      toast((t) => (
        <div className="flex flex-col gap-3">

          <span className="text-sm">
            Delete EVERYTHING?
          </span>

          <div className="flex justify-end gap-2">

            <button
              className="px-3 py-1 rounded bg-white/10 text-white"
              onClick={() => {
                toast.dismiss(t.id);
                toast("Delete cancelled");
                resolve(false);
              }}
            >
              Cancel
            </button>

            <button
              className="px-3 py-1 rounded bg-red-500 text-white"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              Delete
            </button>

          </div>
        </div>
      ));

    });

    if (!confirmed) return;

    const t = toast.loading("Starting full deletion...");

    try {
      setLoading(true);

      const updateToast = (msg) => {
        setProgress(msg);
        toast.loading(msg, { id: t });
      };

      await deleteTableInBatches("rows", updateToast);
      await deleteTableInBatches("columns", updateToast);
      await deleteTableInBatches("dashboard_config", updateToast);
      await deleteTableInBatches("sheets", updateToast);
      await deleteTableInBatches("logs", updateToast);
      await deleteTableInBatches("assets", updateToast);

      setLoading(false);
      setProgress("");

      toast.success("All data deleted ⚠️", { id: t });

      fetchSheets();
      loadDbSize();

    } catch (err) {
      toast.error("Delete failed ❌", { id: t });
    }
  };

  const deleteSelectedSheet = async () => {

    if (!selectedSheet) {
      toast.error("Select a sheet first ❌");
      return;
    }

    const confirmed = await new Promise((resolve) => {

      toast((t) => (
        <div className="flex flex-col gap-3">

          <span className="text-sm">
            Delete this sheet?
          </span>

          <div className="flex justify-end gap-2">

            <button
              className="px-3 py-1 rounded bg-white/10 text-white"
              onClick={() => {
                toast.dismiss(t.id);
                toast("Delete cancelled");
                resolve(false);
              }}
            >
              Cancel
            </button>

            <button
              className="px-3 py-1 rounded bg-red-500 text-white"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              Delete
            </button>

          </div>
        </div>
      ));

    });

    if (!confirmed) return;

    const t = toast.loading("Deleting sheet...");

    try {
      setLoading(true);

      await supabase
        .from("rows")
        .delete()
        .eq("sheet_id", selectedSheet);

      await supabase
        .from("columns")
        .delete()
        .eq("sheet_id", selectedSheet);

      await supabase
        .from("sheets")
        .delete()
        .eq("id", selectedSheet);

      setLoading(false);

      toast.success("Sheet deleted 🗑", { id: t });

      fetchSheets();
      loadDbSize();

    } catch (err) {
      toast.error("Delete failed ❌", { id: t });
    }
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
    <div className="p-6 space-y-6 text-white">

      {/* HEADER */}
      <h1 className="title">
        Admin Panel
      </h1>

      {/* DATABASE */}
      <div className="glass p-6">
        <h2 className="mb-4 font-semibold subtext">Database Usage</h2>

        <p className="text-xl font-semibold">
          Used Space: <span className="text-[#F2B95E]">{dbSize}</span>
        </p>

        <p className="text-sm subtext">
          Free Plan Limit: 500 MB
        </p>

        <button
          onClick={loadDbSize}
          className="mt-4 btn-primary"
        >
          Refresh
        </button>
      </div>

      {/* CREATE USER */}
      <div className="glass p-6">
        <h2 className="mb-5 font-semibold subtext">Create User</h2>

        <div className="grid grid-cols-2 gap-5">

          <input
            placeholder="Username"
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
            className="input"
          />

          <input
            placeholder="Email"
            value={newUser.email}
            onChange={(e) =>
              setNewUser({ ...newUser, email: e.target.value })
            }
            className="input"
          />

          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
            className="input"
          />

          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value })
            }
            className="input"
          >
            <option value="viewer">Viewer</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          onClick={createUser}
          className="mt-5 btn-primary"
        >
          Create User
        </button>
      </div>

      {/* USERS TABLE */}
      <div className="glass p-6">
        <h2 className="mb-5 font-semibold subtext">All Users</h2>

        <div className="overflow-auto">
          <table className="w-full text-sm border-separate border-spacing-y-3">

            <thead>
              <tr className="text-left text-white/60">
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
                  <tr
                    key={u.id}
                    className="table-row hover:scale-[1.01] transition"
                  >
                    <td className="p-3">{u.username}</td>
                    <td className="p-3">{u.email}</td>

                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="input"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td className="p-3 text-xs text-white/60">{u.id}</td>

                    <td className="p-3">
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="btn-danger text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>

          </table>
        </div>
      </div>

      {/* DASHBOARD CONFIG */}
      <div className="glass p-6">
        <h2 className="mb-5 font-semibold subtext">Dashboard Config</h2>

        <div className="grid grid-cols-3 gap-5">

          <select
            className="input"
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
            className="input"
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
            className="input"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="pie">Pie</option>
            <option value="bar">Bar</option>
          </select>
        </div>

        <div className="flex gap-4 mt-5">

          <button
            onClick={saveConfig}
            className="btn-primary"
          >
            Save Chart Config
          </button>

          <button
            onClick={deleteChartConfig}
            className="btn-danger"
          >
            Delete Chart Config
          </button>

        </div>
      </div>

      {/* DELETE */}
      {profile.role === "super_admin" && (
        <div className="glass p-6">
          <h2 className="mb-5 font-semibold text-[#FF653F]">Data Control</h2>

          <select
            className="input mb-4"
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

          <div className="flex gap-4">
            <button
              onClick={deleteSelectedSheet}
              className="btn-danger"
            >
              Delete Sheet
            </button>

            <button
              onClick={deleteAll}
              className="btn-primary"
            >
              Delete Everything
            </button>
          </div>

          {loading && (
            <p className="mt-3 text-white/60">{progress}</p>
          )}
        </div>
      )}

    </div>
  );

}
