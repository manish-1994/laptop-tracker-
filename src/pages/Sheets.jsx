import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import TableView from "../components/TableView";
import SheetTabs from "../components/SheetTabs";
import { importExcel } from "../utils/importExcel";
import toast from "react-hot-toast";

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
      .eq("sheet_id", sheetId)
      .order("position", { ascending: true });

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
      position: columns.length,
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
        const rebuilt = {};

        Object.keys(updated).forEach((key) => {
          if (key === oldKey) {
            rebuilt[newName] = updated[key];
          } else {
            rebuilt[key] = updated[key];
          }
        });

        await supabase
          .from("rows")
          .update({ data: rebuilt })
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
    <div className="p-6 space-y-6 text-white">

      {/* HEADER */}
      <h1 className="title">
        Sheets
      </h1>

      {/* SHEETS TABS */}
      <div className="glass p-4">
        <SheetTabs
          onSelect={(id) => {
            setSelectedSheetId(id);
            load(id);
          }}
        />
      </div>

      {/* ACTION BAR */}
      <div className="glass p-4 flex gap-3 items-center flex-wrap">

        {/* IMPORT */}
        <label className="btn-primary cursor-pointer">
          Import Workbook
          <input
            type="file"
            hidden
            onChange={(e) => importExcel(e.target.files[0])}
          />
        </label>

        {/* INPUT */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{"name":"Laptop"}'
          className="input flex-1 min-w-[250px]"
        />

        {/* ADD ROW */}
        <button
          onClick={addRow}
          className="btn-primary"
        >
          + Row
        </button>

        {/* ADD COLUMN */}
        {(role === "admin" || role === "super_admin") && (
          <button
            onClick={addColumn}
            className="btn-primary"
          >
            + Column
          </button>
        )}

      </div>

      {/* EMPTY STATE */}
      {columns.length === 0 && (
        <div className="glass p-12 text-center">

          <div className="text-4xl mb-3">📄</div>

          <p className="text-white/80 text-lg">
            No columns found for this sheet
          </p>

          <p className="text-sm text-white/50 mt-2">
            Start by adding a column or importing a workbook
          </p>

        </div>
      )}

      {/* TABLE */}
      {columns.length > 0 && (
        <div className="glass p-4">

          {/* 🔥 IMPORTANT WRAPPER FIX */}
          <div className="rounded-xl overflow-auto bg-[#2A1458]/40 border border-white/10">

            <TableView
              rows={rows}
              columns={columns}
              refresh={() => load(selectedSheetId)}
              sheetId={selectedSheetId}
              onColumnRename={updateColumnName}
            />

          </div>

        </div>
      )}

    </div>
  );
}