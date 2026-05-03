import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import TableView from "../components/TableView";
import SheetTabs from "../components/SheetTabs";
import { importExcel } from "../utils/importExcel";

export default function Sheets() {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState("viewer");
  const [selectedSheetId, setSelectedSheetId] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    setRole(user?.role || "viewer");
  }, []);

  // 🔥 LOAD DATA
  const load = async (sheetId) => {
    if (!sheetId) return;

    console.log("🚀 Loading sheet:", sheetId);

    const { data: rowsData } = await supabase
      .from("rows")
      .select("*")
      .eq("sheet_id", sheetId);

    const { data: colData } = await supabase
      .from("columns")
      .select("*")
      .eq("sheet_id", sheetId);

    setRows(rowsData || []);
    setColumns(colData || []);
  };

  // ➕ ADD ROW (SAFE)
const addRow = async () => {
  if (!selectedSheetId) {
    console.error("❌ No sheet selected");
    return;
  }

  // create empty row based on current columns
  const emptyData = {};
  columns.forEach((col) => {
    emptyData[col.name] = "";
  });

  const { error } = await supabase.from("rows").insert({
    sheet_id: selectedSheetId,
    data: emptyData,
  });

  if (error) {
    console.error("❌ Add row failed:", error);
    alert("Failed to add row");
    return;
  }

  console.log("✅ Row added");

  // 🔄 reload table
  load(selectedSheetId);
};

// ➕ ADD COLUMN (SAFE)
const addColumn = async () => {
  if (!selectedSheetId) {
    console.error("❌ No sheet selected");
    return;
  }

  const name = prompt("Enter column name");
  if (!name || !name.trim()) return;

  // 🚫 prevent duplicates
  const exists = columns.some(
    (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  if (exists) {
    alert("Column already exists");
    return;
  }

  // 1️⃣ INSERT COLUMN
  const { error: colError } = await supabase.from("columns").insert({
    sheet_id: selectedSheetId,
    name: name.trim(),
  });

  if (colError) {
    console.error("❌ Column insert failed:", colError);
    alert("Failed to add column");
    return;
  }

  // 2️⃣ UPDATE ALL ROWS (add new key)
  const { data: rowsData, error: rowsError } = await supabase
    .from("rows")
    .select("*")
    .eq("sheet_id", selectedSheetId);

  if (rowsError) {
    console.error("❌ Fetch rows failed:", rowsError);
    return;
  }

  for (const row of rowsData || []) {
    await supabase
      .from("rows")
      .update({
        data: { ...row.data, [name.trim()]: "" },
      })
      .eq("id", row.id);
  }

  console.log("✅ Column added");

  // 🔄 reload
  load(selectedSheetId);
};

  // 🔥 SINGLE SOURCE OF TRUTH (COLUMN RENAME)
  const updateColumnName = async (columnId, oldName, newName) => {
    if (!newName || newName === oldName) return;

    console.log("🔁 Renaming:", oldName, "→", newName);

    const normalize = (str) =>
      (str || "").toString().trim().toLowerCase().replace(/^@/, "");

    // 1️⃣ UPDATE COLUMN TABLE
    const { error } = await supabase
      .from("columns")
      .update({ name: newName })
      .eq("id", columnId);

    if (error) {
      console.error(error);
      return;
    }

    // 2️⃣ FETCH ROWS
    const { data: rowsData } = await supabase
      .from("rows")
      .select("*")
      .eq("sheet_id", selectedSheetId);

    // 3️⃣ UPDATE JSON KEYS
    for (let row of rowsData || []) {
      const updated = { ...row.data };

      const oldKey = Object.keys(updated).find(
        (k) => normalize(k) === normalize(oldName)
      );

      if (oldKey !== undefined) {
        updated[newName] = updated[oldKey];
        delete updated[oldKey];

        await supabase
          .from("rows")
          .update({ data: updated })
          .eq("id", row.id);
      }
    }

    // 4️⃣ LOG
    await supabase.from("logs").insert({
      action_type: "rename_column",
      column_name: oldName,
      old_value: oldName,
      new_value: newName,
      description: `Renamed ${oldName} → ${newName}`,
    });

    // 5️⃣ RELOAD
    await load(selectedSheetId);

// 🔥 FORCE UI RESET (VERY IMPORTANT)
setTimeout(() => {
  setRows([]);
  setColumns([]);
  load(selectedSheetId);
}, 50);
  };



  // 🔥 ADD COLUMN
 

  return (
    <div className="p-6">

      <h1 className="text-2xl font-semibold mb-4">Sheets</h1>

      {/* SHEETS */}
      <SheetTabs
        onSelect={(id) => {
          setSelectedSheetId(id);
          load(id);
        }}
      />

      {/* ACTION BAR */}
      <div className="flex gap-2 mt-4 mb-4">

        <label className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer">
          Import Workbook
          <input
            type="file"
            hidden
            onChange={(e) => importExcel(e.target.files[0])}
          />
        </label>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"name":"Laptop"}'
          className="border px-3 py-2 rounded w-full"
        />

        <button
  onClick={addRow}
  className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl shadow hover:scale-105 transition"
>
  + Row
</button>

        {(role === "admin" || role === "super_admin") && (
          <button
  onClick={addColumn}
  className="bg-gray-800 text-white px-4 py-2 rounded-xl shadow hover:scale-105 transition"
>
  + Column
</button>
        )}
      </div>

      {/* EMPTY */}
      {columns.length === 0 && (
        <div className="text-gray-400 text-center mt-10">
          No columns found for this sheet
        </div>
      )}

      {/* TABLE */}
      {columns.length > 0 && (
       <TableView
  rows={rows}
  columns={columns}
  refresh={() => load(selectedSheetId)}
  sheetId={selectedSheetId}
  onColumnRename={updateColumnName}
/>
      )}

    </div>
  );
}