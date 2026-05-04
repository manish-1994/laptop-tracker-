import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export default function TableView({ rows, columns, refresh, sheetId, onColumnRename }) {
  onColumnRename = onColumnRename || (() => { });

  const [search, setSearch] = useState("");
  const [editCell, setEditCell] = useState(null);
  const [editHeader, setEditHeader] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    setUser(profile);
  };

  const canEditHeader = user?.role === "super_admin";
  const canEditCell =
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "user";

  const canDelete =
    user?.role === "super_admin" ||
    user?.role === "admin";

  // 🔥 NORMALIZE (handles @ issue)
  const normalize = (str) =>
    (str || "").toString().trim().toLowerCase().replace(/^@/, "");

  // 🔥 SAFE VALUE FETCH
  // 🔥 SAFE VALUE FETCH
  const getValue = (row, col) => {
    if (row.data?.hasOwnProperty(col)) {
      return row.data[col];
    }

    const target = normalize(col);

    const key = Object.keys(row.data || {}).find(
      (k) => normalize(k) === target
    );

    return key ? row.data[key] : "";
  };

  // 🔥 CELL UPDATE
  const updateCell = async (row, col, value) => {
    let realKey = col;

    if (!row.data?.hasOwnProperty(realKey)) {
      const matchedKey = Object.keys(row.data || {}).find(
        (k) => normalize(k) === normalize(col)
      );

      if (matchedKey) {
        realKey = matchedKey;
      }
    }

    const oldValue = row.data?.[realKey] || "";

    // 🚫 skip if same
    if (oldValue === value) return;

    // 1️⃣ UPDATE DB
    const { error: updateError } = await supabase
      .from("rows")
      .update({
        data: { ...row.data, [realKey]: value },
      })
      .eq("id", row.id);

    if (updateError) {
      console.error("❌ Update failed:", updateError);
      return;
    }

    // 2️⃣ GET USER (WORKS FOR ALL ROLES)
    const { data: authData } = await supabase.auth.getUser();

    let userId = null;
    let username = "unknown";

    if (authData?.user) {
      userId = authData.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      // ✅ fallback to email if username missing
      username =
        profile?.username ||
        authData.user.email ||
        "unknown";
    }

    // 3️⃣ INSERT LOG
    const { error: logError } = await supabase.from("logs").insert({
      action_type: "UPDATE_CELL",
      performed_by: userId,
      user_name: username,
      column_name: col,
      old_value: oldValue,
      new_value: value,
      description: `Updated ${col}`,
    });

    if (logError) {
      console.error("❌ Log failed:", logError);
    } else {
      console.log("✅ Log inserted");
    }

    // 4️⃣ REFRESH
    refresh();
  };


  // ❌ DELETE COLUMN (SAFE)
  const deleteColumn = async (col) => {

    if (!canDelete) {
      alert("You do not have permission to delete columns");
      return;
    }

    if (!confirm(`Delete column "${col.name}"?`)) return;

    try {
      // 1️⃣ delete column from columns table
      const { error: colError } = await supabase
        .from("columns")
        .delete()
        .eq("id", col.id);

      if (colError) {
        console.error("❌ Column delete failed:", colError);
        alert("Failed to delete column");
        return;
      }

      // 2️⃣ get all rows
      const { data: rowsData, error: fetchError } = await supabase
        .from("rows")
        .select("*")
        .eq("sheet_id", sheetId);

      if (fetchError) {
        console.error("❌ Fetch rows failed:", fetchError);
        return;
      }

      // 3️⃣ remove key from each row
      for (const row of rowsData || []) {
        const updated = { ...row.data };

        delete updated[col.name];

        await supabase
          .from("rows")
          .update({ data: updated })
          .eq("id", row.id);
      }

      console.log("✅ Column deleted");

      // 4️⃣ refresh UI
      refresh();

    } catch (err) {
      console.error("❌ Unexpected error:", err);
    }
  };

  // ❌ DELETE ROW (SAFE)
  const deleteRow = async (rowId) => {

    if (!canDelete) {
      alert("You do not have permission to delete rows");
      return;
    }
    if (!confirm("Delete this row?")) return;

    try {
      const { error } = await supabase
        .from("rows")
        .delete()
        .eq("id", rowId);

      if (error) {
        console.error("❌ Delete row failed:", error);
        alert("Failed to delete row");
        return;
      }

      console.log("✅ Row deleted");

      refresh();
    } catch (err) {
      console.error("❌ Unexpected error:", err);
    }
  };




  // 🔥 🔥 CRITICAL FIX: COLUMN RENAME (WITH JSON UPDATE)


  const filtered = rows.filter((r) =>
    Object.values(r.data || {})
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
  <div className="bg-[#2A1458]/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-4 text-white">

    {/* SEARCH */}
    <input
      placeholder="🔍 Search..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="mb-4 w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-[#FF653F] outline-none"
    />

    <div className="overflow-auto max-h-[70vh]">

      <table className="w-full text-sm border-separate border-spacing-y-2">

        {/* HEADER */}
        <thead className="bg-[#52366B]/80 backdrop-blur sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className="px-3 py-3 text-left text-xs font-semibold text-white/80 whitespace-nowrap"
              >

                {editHeader === col.id ? (
                  <input
                    autoFocus
                    defaultValue={col.name}
                    onBlur={(e) => {
                      onColumnRename(col.id, col.name, e.target.value);
                      setEditHeader(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onColumnRename(col.id, col.name, e.target.value);
                        setEditHeader(null);
                      }
                    }}
                    className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded w-full"
                  />
                ) : (
                  <div className="flex items-center gap-2">

                    <span
                      onClick={() =>
                        canEditHeader && setEditHeader(col.id)
                      }
                      className={`truncate ${canEditHeader ? "cursor-pointer hover:text-[#F2B95E]" : ""}`}
                    >
                      {col.name}
                    </span>

                    {canDelete && (
                      <button
                        onClick={() => deleteColumn(col)}
                        className="text-red-400 hover:text-red-500 text-xs"
                      >
                        ✕
                      </button>
                    )}

                  </div>
                )}

              </th>
            ))}
            <th className="px-2"></th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {filtered.map((row) => (
            <tr
              key={row.id}
              className="bg-[#2A1458]/60 hover:bg-[#52366B]/40 transition rounded-xl"
            >
              {columns.map((col) => {
                const value = getValue(row, col.name);
                const isEditing =
                  editCell === `${row.id}-${col.name}`;

                return (
                  <td key={col.id} className="px-3 py-2 text-white whitespace-nowrap">

                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={value}
                        onBlur={(e) => {
                          updateCell(row, col.name, e.target.value);
                          setEditCell(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateCell(row, col.name, e.target.value);
                            setEditCell(null);
                          }
                        }}
                        className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded w-full"
                      />
                    ) : (
                      <div
                        onClick={() =>
                          canEditCell &&
                          setEditCell(`${row.id}-${col.name}`)
                        }
                        className={`px-1 rounded ${
                          canEditCell ? "cursor-pointer hover:bg-white/10" : ""
                        }`}
                      >
                        <span className={value ? "" : "text-white/40 italic"}>
                          {value || "Empty"}
                        </span>
                      </div>
                    )}

                  </td>
                );
              })}

              {/* DELETE */}
              <td className="px-2 text-center">
                {canDelete && (
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-red-400 hover:text-red-500 text-sm"
                  >
                    🗑
                  </button>
                )}
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  </div>
);
}