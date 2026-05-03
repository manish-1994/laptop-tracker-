import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function RecordManager() {
  const [sheets, setSheets] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  const [selectedSheet, setSelectedSheet] = useState("");
  const [search, setSearch] = useState("");

  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});

  // 🔥 LOAD SHEETS
  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    const { data } = await supabase.from("sheets").select("*");
    setSheets(data || []);
  };

  // 🔥 LOAD DATA WHEN SHEET CHANGES
  useEffect(() => {
    if (!selectedSheet) return;
    loadData();
  }, [selectedSheet]);

  const loadData = async () => {
    const { data: cols } = await supabase
      .from("columns")
      .select("*")
      .eq("sheet_id", selectedSheet);

    const { data: rowsData } = await supabase
      .from("rows")
      .select("*")
      .eq("sheet_id", selectedSheet);

    setColumns(cols || []);
    setRows(rowsData || []);
  };

  // 🔍 SEARCH FILTER
  const filtered = rows.filter((row) => {
    const values = Object.values(row.data || {})
      .join(" ")
      .toLowerCase();
    return values.includes(search.toLowerCase());
  });

  // ✏️ EDIT
  const startEdit = (row) => {
    setEditingRow(row.id);
    setEditedData(row.data);
  };

  const saveEdit = async (rowId) => {
    await supabase
      .from("rows")
      .update({ data: editedData })
      .eq("id", rowId);

    setEditingRow(null);
    loadData();
  };

  const deleteRow = async (rowId) => {
    if (!confirm("Delete this record?")) return;

    await supabase.from("rows").delete().eq("id", rowId);
    loadData();
  };

  return (
  <div className="p-6">

    <div className="glass p-6 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          📊
          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
            Record Manager
          </span>
        </h2>
      </div>

      {/* CONTROLS */}
      <div className="flex gap-4 flex-wrap">

        <select
          value={selectedSheet}
          onChange={(e) => setSelectedSheet(e.target.value)}
          className="input w-64"
        >
          <option value="">Select Sheet</option>
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[250px]"
        />

      </div>

      {/* TABLE */}
      <div className="overflow-auto max-h-[70vh] rounded-xl border border-gray-200">

        <table className="w-full text-sm border-collapse">

          {/* HEADER */}
          <thead className="bg-gradient-to-r from-gray-900 to-gray-800 text-white sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="px-4 py-3 text-left text-xs uppercase tracking-wide"
                >
                  {col.name}
                </th>
              ))}
              <th className="px-4 py-3 text-xs uppercase">Actions</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>

            {filtered.map((row, index) => (
              <tr
                key={row.id}
                className={`transition ${
                  index % 2 === 0 ? "bg-white/70" : "bg-white/40"
                } hover:bg-indigo-50`}
              >

                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="px-4 py-3 text-gray-700"
                  >
                    {editingRow === row.id ? (
                      <input
                        value={editedData[col.name] || ""}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            [col.name]: e.target.value,
                          })
                        }
                        className="input"
                      />
                    ) : (
                      row.data[col.name] || "-"
                    )}
                  </td>
                ))}

                {/* ACTIONS */}
                <td className="px-4 py-3 flex gap-2">

                  {editingRow === row.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(row.id)}
                        className="bg-green-500/10 text-green-600 px-3 py-1 rounded-lg hover:bg-green-500 hover:text-white transition"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => setEditingRow(null)}
                        className="bg-gray-200 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(row)}
                        className="bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-lg hover:bg-indigo-500 hover:text-white transition"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteRow(row.id)}
                        className="bg-red-500/10 text-red-600 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white transition"
                      >
                        Delete
                      </button>
                    </>
                  )}

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  </div>
);
}