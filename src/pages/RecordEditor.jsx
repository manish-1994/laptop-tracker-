import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function RecordEditor() {
  const [sheets, setSheets] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);

  const [selectedSheet, setSelectedSheet] = useState("");
  const [search, setSearch] = useState("");

  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    const { data } = await supabase.from("sheets").select("*");
    setSheets(data || []);
  };

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

  const filtered = rows.filter((row) =>
    Object.values(row.data || {})
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const selectRow = (row) => {
    setSelectedRow(row);
    setFormData(row.data);
  };

  const updateField = (key, value) => {
    setFormData({ ...formData, [key]: value });
  };

  const save = async () => {
    await supabase
      .from("rows")
      .update({ data: formData })
      .eq("id", selectedRow.id);

    loadData();
  };

  const deleteRow = async () => {
    if (!confirm("Delete this record?")) return;

    await supabase.from("rows").delete().eq("id", selectedRow.id);
    setSelectedRow(null);
    loadData();
  };

  return (
  <div className="p-6 bg-gradient-to-br from-slate-100 to-gray-200 min-h-screen">

    <div className="bg-white/80 backdrop-blur-lg border rounded-2xl shadow-2xl p-6">

      {/* HEADER */}
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        🧾
        <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Record Editor
        </span>
      </h2>

      {/* CONTROLS */}
      <div className="flex gap-4 mb-6">
        <select
          value={selectedSheet}
          onChange={(e) => setSelectedSheet(e.target.value)}
          className="px-4 py-2 rounded-xl border shadow-sm"
        >
          <option value="">Select Sheet</option>
          {sheets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          placeholder="🔍 Search record..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl border shadow-sm"
        />
      </div>

      {/* RECORD LIST */}
      <div className="grid grid-cols-3 gap-4">

        {filtered.map((row) => (
          <div
            key={row.id}
            onClick={() => selectRow(row)}
            className={`p-4 rounded-xl border cursor-pointer transition shadow-sm
              ${
                selectedRow?.id === row.id
                  ? "bg-indigo-100 border-indigo-400"
                  : "hover:bg-gray-100"
              }`}
          >
            <div className="font-medium text-gray-700">
              {Object.values(row.data).slice(0, 2).join(" - ")}
            </div>
          </div>
        ))}

      </div>
    </div>

    {/* 🔥 SIDE DRAWER */}
    {selectedRow && (
      <div className="fixed top-0 right-0 w-[400px] h-full bg-white shadow-2xl p-6 overflow-auto border-l z-50">

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Record</h3>
          <button onClick={() => setSelectedRow(null)}>✕</button>
        </div>

        <div className="space-y-4">

          {columns.map((col) => {
            const originalValue = selectedRow.data[col.name] || "";
            const currentValue = formData[col.name] || "";
            const changed = originalValue !== currentValue;

            return (
              <div
                key={col.id}
                className={`p-3 rounded-lg border ${
                  changed ? "border-indigo-400 bg-indigo-50" : ""
                }`}
              >
                <label className="text-xs text-gray-500">
                  {col.name}
                </label>

                <input
                  value={currentValue}
                  onChange={async (e) => {
                    const newValue = e.target.value;

                    const updated = {
                      ...formData,
                      [col.name]: newValue,
                    };

                    setFormData(updated);

                    // 🔥 AUTO SAVE
                    await supabase
                      .from("rows")
                      .update({ data: updated })
                      .eq("id", selectedRow.id);
                  }}
                  className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                />
              </div>
            );
          })}

          {/* DELETE */}
          <button
            onClick={deleteRow}
            className="w-full bg-red-500 text-white py-2 rounded-lg mt-4 hover:bg-red-600"
          >
            Delete Record
          </button>

        </div>

      </div>
    )}

  </div>
);
}