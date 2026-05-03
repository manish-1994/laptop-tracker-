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
    <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen">

      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-gray-200">

        {/* HEADER */}
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          📊
          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
            Record Manager
          </span>
        </h2>

        {/* CONTROLS */}
        <div className="flex gap-4 mb-6">

          <select
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.target.value)}
            className="border border-gray-300 px-4 py-2 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none"
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
            className="border border-gray-300 px-4 py-2 rounded-xl shadow-sm w-full focus:ring-2 focus:ring-indigo-400 outline-none"
          />

        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[70vh] rounded-xl">

          <table className="w-full text-sm border-separate border-spacing-y-3">

            {/* HEADER */}
            <thead className="bg-gray-900 text-white sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-left text-xs uppercase tracking-wide"
                  >
                    {col.name}
                  </th>
                ))}
                <th className="px-4">Actions</th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>

              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="bg-white hover:bg-indigo-50 transition shadow-sm rounded-xl"
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
                          className="border border-gray-300 px-2 py-1 rounded-lg w-full focus:ring-2 focus:ring-indigo-400 outline-none"
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
                          className="px-3 py-1 text-xs bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                        >
                          Save
                        </button>

                        <button
                          onClick={() => setEditingRow(null)}
                          className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(row)}
                          className="px-3 py-1 text-xs bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteRow(row.id)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
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