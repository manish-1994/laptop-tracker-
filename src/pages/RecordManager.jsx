import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";

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
      .eq("sheet_id", selectedSheet)
      .order("position", { ascending: true });

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
    <div className="p-6 text-white">

      <div className="bg-[#2A1458]/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            📊
            <span className="bg-gradient-to-r from-[#FF653F] to-[#F2B95E] text-transparent bg-clip-text">
              Record Manager
            </span>
          </h2>
        </div>

        {/* CONTROLS */}
        <div className="flex gap-4 flex-wrap">

          <select
            value={selectedSheet}
            onChange={(e) => {
              setSelectedSheet(e.target.value);

              if (e.target.value) {
                toast.success("Sheet selected ✅");
              }
            }}
            className="
            px-4 py-2 rounded-xl
            bg-[#2A1458]/70 text-white
            border border-white/20
            backdrop-blur-xl
            shadow-md
            focus:ring-2 focus:ring-[#FF653F]
            outline-none
            appearance-none
            cursor-pointer
          "
          >
            <option value="" className="bg-[#2A1458] text-white">
              Select Sheet
            </option>

            {sheets.map((s) => (
              <option
                key={s.id}
                value={s.id}
                className="bg-[#2A1458] text-white"
              >
                {s.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[250px] px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-[#FF653F] outline-none"
          />

        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[70vh] rounded-xl border border-white/10">

          <table className="w-full text-sm border-separate border-spacing-y-2">

            {/* HEADER */}
            <thead className="bg-[#52366B]/80 backdrop-blur sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-left text-xs uppercase tracking-wide text-white/80 whitespace-nowrap"
                  >
                    {col.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-xs uppercase text-white/80">
                  Actions
                </th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>

              {filtered.map((row, index) => (
                <tr
                  key={row.id}
                  className="bg-[#2A1458]/60 hover:bg-[#52366B]/40 transition rounded-xl"
                >

                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className="px-4 py-3 text-white whitespace-nowrap"
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
                          className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-white"
                        />
                      ) : (
                        <span
                          className={
                            !row.data[col.name]
                              ? "text-white/40 italic"
                              : ""
                          }
                        >
                          {row.data[col.name] || "Empty"}
                        </span>
                      )}
                    </td>
                  ))}

                  {/* ACTIONS */}
                  <td className="px-4 py-3 flex gap-2">

                    {editingRow === row.id ? (
                      <>
                        <button
                          onClick={() => {
                            toast.loading("Saving changes...");
                            saveEdit(row.id);
                          }}
                          className="px-3 py-1 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500 hover:text-white transition"
                        >
                          Save
                        </button>

                        <button
                          onClick={() => {
                            setEditingRow(null);
                            toast("Edit cancelled");
                          }}
                          className="px-3 py-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            startEdit(row);
                            toast.success("Edit mode enabled ✏️");
                          }}
                          className="px-3 py-1 rounded-lg bg-[#FF653F]/20 text-[#FF653F] hover:bg-[#FF653F] hover:text-white transition"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            toast.loading("Deleting record...");
                            deleteRow(row.id);
                          }}
                          className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition"
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