import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

export default function TableView({ rows, columns, refresh, sheetId, onColumnRename }) {
    onColumnRename = onColumnRename || (() => {});

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

  await supabase
    .from("rows")
    .update({
      data: { ...row.data, [realKey]: value },
    })
    .eq("id", row.id);

  refresh();
};

  // 🔥 🔥 CRITICAL FIX: COLUMN RENAME (WITH JSON UPDATE)
  

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
                        onColumnRename(col.id, col.name, e.target.value);
                        setEditHeader(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onColumnRename(col.id, col.name, e.target.value);
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