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
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({});

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

  const addRecord = async () => {
    if (!selectedSheet) {
      alert("Select a sheet first");
      return;
    }

    const { error } = await supabase.from("rows").insert({
      sheet_id: selectedSheet,
      data: newRecord,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setShowAdd(false);
    setNewRecord({});
    loadData(); // refresh
  };

  const deleteRow = async () => {
    if (!confirm("Delete this record?")) return;

    await supabase.from("rows").delete().eq("id", selectedRow.id);
    setSelectedRow(null);
    loadData();
  };

 return (
  <>
    <div className="p-6">

      <div className="glass p-6 space-y-6">

        {/* HEADER */}
        <h2 className="text-3xl font-bold flex items-center gap-2">
          🧾
          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Record Editor
          </span>
        </h2>

        {/* CONTROLS */}
        <div className="flex gap-4 flex-wrap">

          <button
            onClick={() => setShowAdd(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl shadow hover:scale-105 transition"
          >
            + Add Record
          </button>

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
            placeholder="🔍 Search record..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input flex-1 min-w-[250px]"
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
                    ? "bg-indigo-100 border-indigo-400 shadow-md"
                    : "bg-white/60 hover:bg-indigo-50"
                }`}
            >
              <div className="font-medium text-gray-700">
                {Object.values(row.data).slice(0, 2).join(" - ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔥 EDIT DRAWER */}
      {selectedRow && (
        <div className="fixed top-0 right-0 w-[600px] h-full bg-white/90 backdrop-blur-xl shadow-2xl p-6 overflow-auto border-l z-50">

          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-700">
              Edit Record
            </h3>

            <button
              onClick={() => setSelectedRow(null)}
              className="text-gray-500 hover:text-red-500 text-lg"
            >
              ✕
            </button>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-2 gap-4">

            {columns.map((col) => {
              const originalValue = selectedRow.data[col.name] || "";
              const currentValue = formData[col.name] || "";
              const changed = originalValue !== currentValue;

              return (
                <div
                  key={col.id}
                  className={`p-3 rounded-xl border transition ${
                    changed
                      ? "border-indigo-400 bg-indigo-50 shadow-sm"
                      : "bg-white/60"
                  }`}
                >
                  {/* ✅ PREMIUM LABEL FIX */}
                  <label
                    title={col.name}
                    className="text-xs text-gray-500 font-medium mb-1 leading-tight break-words line-clamp-2"
                  >
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

                      await supabase
                        .from("rows")
                        .update({ data: updated })
                        .eq("id", selectedRow.id);
                    }}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                  />
                </div>
              );
            })}

          </div>

          <button
            onClick={deleteRow}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-2 rounded-xl shadow hover:scale-105 transition mt-6"
          >
            Delete Record
          </button>

        </div>
      )}
    </div>

    {/* 🔥 ADD RECORD MODAL (FIXED POSITION + PREMIUM) */}
    {showAdd && (
      <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-10 z-50 overflow-y-auto">

        <div className="bg-white rounded-2xl shadow-2xl p-6 w-[1000px] max-w-[95vw] animate-[fadeIn_0.2s_ease]">

          <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text">
            Add New Record
          </h3>

          <div className="grid grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto pr-2">

            {columns.map((col) => (
              <div key={col.id} className="flex flex-col">

                {/* ✅ PREMIUM LABEL FIX */}
                <label
                  title={col.name}
                  className="text-xs text-gray-500 mb-1 leading-tight break-words line-clamp-2"
                >
                  {col.name}
                </label>

                <input
                  value={newRecord[col.name] || ""}
                  onChange={(e) =>
                    setNewRecord({
                      ...newRecord,
                      [col.name]: e.target.value,
                    })
                  }
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                />
              </div>
            ))}

          </div>

          <div className="flex justify-end gap-3 mt-6">

            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>

            <button
              onClick={addRecord}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow hover:scale-105 transition"
            >
              Save
            </button>

          </div>

        </div>
      </div>
    )}
  </>
);

 }