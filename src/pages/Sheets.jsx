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
  };

  // 🔥 ADD ROW
  const addRow = async () => {
    if (!selectedSheetId) return alert("Select sheet first");

    let parsed;
    try {
      parsed = JSON.parse(input);
    } catch {
      return alert("Invalid JSON");
    }

    await supabase.from("rows").insert({
      sheet_id: selectedSheetId,
      data: parsed,
    });

    setInput("");
    load(selectedSheetId);
  };

  // 🔥 ADD COLUMN
  const addColumn = async () => {
    if (!selectedSheetId) return alert("Select sheet first");

    let name = prompt("Column name");
    if (!name) return;

    // ✅ AUTO CLEAN (important)
    name = name.trim();

    await supabase.from("columns").insert({
      sheet_id: selectedSheetId,
      name,
      type: "text",
    });

    load(selectedSheetId);
  };

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
          className="bg-indigo-600 text-white px-4 rounded"
        >
          + Row
        </button>

        {(role === "admin" || role === "super_admin") && (
          <button
            onClick={addColumn}
            className="bg-gray-800 text-white px-4 rounded"
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
          onColumnRename={updateColumnName} // ✅ ONLY THIS HANDLES RENAME
        />
      )}

    </div>
  );
}