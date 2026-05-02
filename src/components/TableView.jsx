import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export default function TableView({ rows, columns, refresh, sheetId }) {
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

  // 🔥 NORMALIZE (handles @ issue)
  const normalize = (str) =>
    (str || "").toString().trim().toLowerCase().replace(/^@/, "");

  // 🔥 SAFE VALUE FETCH
  const getValue = (row, col) => {
    const target = normalize(col);

    const key = Object.keys(row.data || {}).find(
      (k) => normalize(k) === target
    );

    return key ? row.data[key] : "";
  };

  // 🔥 CELL UPDATE
  const updateCell = async (row, col, value) => {
    const realKey =
      Object.keys(row.data || {}).find(
        (k) => normalize(k) === normalize(col)
      ) || col;

    await supabase
      .from("rows")
      .update({
        data: { ...row.data, [realKey]: value },
      })
      .eq("id", row.id);

    refresh();
  };

  // 🔥 🔥 CRITICAL FIX: COLUMN RENAME (WITH JSON UPDATE)
  const renameColumn = async (columnId, oldName, newName) => {
    if (!newName || oldName === newName) return;

    console.log("🔁 Renaming:", oldName, "→", newName);

    // 1️⃣ UPDATE COLUMN TABLE
    const { error: colError } = await supabase
      .from("columns")
      .update({ name: newName })
      .eq("id", columnId);

    if (colError) {
      console.error("Column update error:", colError);
      return;
    }

    // 2️⃣ FETCH ALL ROWS
    const { data: rowsData } = await supabase
      .from("rows")
      .select("*")
      .eq("sheet_id", sheetId);

    // 3️⃣ UPDATE JSON KEYS
    for (let row of rowsData || []) {
      const data = { ...row.data };

      const existingKey = Object.keys(data).find(
        (k) => normalize(k) === normalize(oldName)
      );

      if (existingKey) {
        data[newName] = data[existingKey];
        delete data[existingKey];

        await supabase
          .from("rows")
          .update({ data })
          .eq("id", row.id);
      }
    }

    console.log("✅ Column + rows updated");

    refresh();
  };

  const filtered = rows.filter((r) =>
    Object.values(r.data || {})
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow border p-4">

      <input
        placeholder="🔍 Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full px-4 py-2 border rounded"
      />

      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">

          {/* HEADER */}
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="px-3 py-2 text-left text-xs font-semibold">

                  {editHeader === col.id ? (
                    <input
                      autoFocus
                      defaultValue={col.name}
                      onBlur={(e) => {
                        renameColumn(col.id, col.name, e.target.value);
                        setEditHeader(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          renameColumn(col.id, col.name, e.target.value);
                          setEditHeader(null);
                        }
                      }}
                      className="border px-2 py-1 rounded w-full"
                    />
                  ) : (
                    <div
                      onClick={() =>
                        canEditHeader && setEditHeader(col.id)
                      }
                      className={canEditHeader ? "cursor-pointer" : ""}
                    >
                      {col.name}
                    </div>
                  )}

                </th>
              ))}
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b">
                {columns.map((col) => {
                  const value = getValue(row, col.name);
                  const isEditing =
                    editCell === `${row.id}-${col.name}`;

                  return (
                    <td key={col.id} className="px-3 py-2">

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
                          className="border px-2 py-1 rounded w-full"
                        />
                      ) : (
                        <div
                          onClick={() =>
                            canEditCell &&
                            setEditCell(`${row.id}-${col.name}`)
                          }
                          className={canEditCell ? "cursor-pointer" : ""}
                        >
                          {value || "-"}
                        </div>
                      )}

                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}