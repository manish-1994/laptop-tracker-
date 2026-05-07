import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


export default function RecordEditor() {
  const [sheets, setSheets] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [profile, setProfile] = useState(null);

  const [selectedSheet, setSelectedSheet] = useState("");
  const [search, setSearch] = useState("");

  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({});

  useEffect(() => {
    loadSheets();
    loadProfile();

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

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
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
      toast.error("Select a sheet first ❌");
      return false;
    }

    const { error } = await supabase.from("rows").insert({
      sheet_id: selectedSheet,
      data: newRecord,
    });

    if (error) {
      toast.error(error.message);
      return false;
    }

    // 🔥 LOG RECORD CREATION
    await supabase.from("logs").insert({
      user_name: profile?.username || "Unknown",
      user_role: profile?.role || "user",
      action_type: "created record",
      description: "Added new record",
    });

    setShowAdd(false);
    setNewRecord({});

    loadData();

    return true;
  };


  const exportToExcel = () => {

    if (!rows.length) {
      toast.error("No data to export ❌");
      return;
    }

    // 🔥 CLEAN DATA
    const exportData = rows.map((row) => row.data);

    // ✅ CREATE WORKSHEET
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // ✅ CREATE WORKBOOK
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Records"
    );

    // ✅ GENERATE EXCEL BUFFER
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    // ✅ CREATE FILE
    const fileData = new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      }
    );

    // ✅ SAVE FILE
    saveAs(
      fileData,
      `${selectedSheet || "records"}.xlsx`
    );

    toast.success("Excel exported ✅");
  };

  const exportFullWorkbook = async () => {

    if (!sheets.length) {
      toast.error("No sheets found ❌");
      return;
    }

    const workbook = XLSX.utils.book_new();

    for (const sheet of sheets) {

      // ✅ GET ROWS FOR SHEET
      const { data: sheetRows } = await supabase
        .from("rows")
        .select("*")
        .eq("sheet_id", sheet.id);

      const exportData = (sheetRows || []).map(
        (row) => row.data
      );

      // ✅ CREATE WORKSHEET
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // ✅ ADD TAB
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        sheet.name.substring(0, 31) // Excel limit
      );
    }

    // ✅ GENERATE FILE
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
      }
    );

    saveAs(fileData, "Full_Workbook.xlsx");

    toast.success("Full workbook exported ✅");
  };

  const deleteRow = async () => {
    return new Promise((resolve) => {

      toast((t) => (
        <div className="flex flex-col gap-3">

          <span className="text-sm">
            Delete this record?
          </span>

          <div className="flex justify-end gap-2">

            <button
              className="px-3 py-1 rounded bg-white/10 text-white"
              onClick={() => {
                toast.dismiss(t.id);
                toast("Delete cancelled");
                resolve(false);
              }}
            >
              Cancel
            </button>

            <button
              className="px-3 py-1 rounded bg-red-500 text-white"
              onClick={async () => {

                toast.dismiss(t.id);

                const { error } = await supabase
                  .from("rows")
                  .delete()
                  .eq("id", selectedRow.id);

                if (error) {
                  toast.error("Delete failed ❌");
                  resolve(false);
                  return;
                }

                setSelectedRow(null);
                loadData();

                await supabase.from("logs").insert({
                  user_name: profile?.username || "Unknown",
                  user_role: profile?.role || "user",
                  action_type: "deleted record",
                  description: "Deleted record",
                });

                toast.success("Record deleted 🗑");

                resolve(true);
              }}
            >
              Delete
            </button>

          </div>
        </div>
      ));

    });
  };

  return (
    <>
      <div className="p-6 text-white">

        <div className="bg-[#2A1458]/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 space-y-6">

          {/* HEADER */}
          <h2 className="text-3xl font-bold flex items-center gap-2">
            🧾
            <span className="bg-gradient-to-r from-[#FF653F] to-[#F2B95E] bg-clip-text text-transparent">
              Record Editor
            </span>
          </h2>

          {/* CONTROLS */}
          <div className="flex gap-4 flex-wrap">

            <button
              onClick={exportFullWorkbook}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white shadow hover:scale-105 transition"
            >
              Export Full Workbook
            </button>

            <button
              onClick={exportToExcel}
              className="px-4 py-2 rounded-xl bg-green-600 text-white shadow hover:scale-105 transition"
            >
              Export Excel
            </button>

            <button
              onClick={() => {
                toast.success("Add Record Modal Opened ✅");
                setShowAdd(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF653F] to-[#F2B95E] text-white shadow hover:scale-105 transition"
            >
              + Add Record
            </button>

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
              placeholder="🔍 Search record..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[250px] px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-[#FF653F] outline-none"
            />

          </div>

          {/* RECORD LIST */}
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((row) => (
              <div
                key={row.id}
                onClick={() => {
                  selectRow(row);
                  toast.success("Record selected ✅");
                }}
                className={`p-4 rounded-xl border cursor-pointer transition
                ${selectedRow?.id === row.id
                    ? "bg-[#52366B] border-[#FF653F] shadow-lg"
                    : "bg-[#2A1458]/60 hover:bg-[#52366B]/40 border-white/10"
                  }`}
              >
                <div className="font-medium text-white">
                  {Object.values(row.data).slice(0, 2).join(" - ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🔥 EDIT DRAWER */}
        {selectedRow && (
          <div className="fixed top-0 right-0 w-[600px] h-full bg-[#1A0F3A] backdrop-blur-xl shadow-2xl p-6 overflow-auto border-l border-white/10 z-50">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">
                Edit Record
              </h3>

              <button
                onClick={() => {
                  setSelectedRow(null);
                  toast("Editor closed");
                }}
                className="text-white/60 hover:text-red-400 text-lg"
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
                    className={`p-3 rounded-xl border transition ${changed
                      ? "border-[#FF653F] bg-[#52366B]/30"
                      : "bg-[#2A1458]/60 border-white/10"
                      }`}
                  >
                    <label
                      title={col.name}
                      className="text-xs text-white/60 mb-1 block"
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

                        const { error } = await supabase
                          .from("rows")
                          .update({ data: updated })
                          .eq("id", selectedRow.id);

                        if (error) {
                          toast.error("Auto-save failed ❌");
                        }
                      }}

                      onBlur={async (e) => {
                        const finalValue = e.target.value;

                        if (originalValue === finalValue) return;

                        await supabase.from("logs").insert({
                          user_name: profile?.username || "Unknown",
                          user_role: profile?.role || "user",
                          action_type: "updated field",
                          column_name: col.name,
                          old_value: originalValue,
                          new_value: finalValue,
                          description: `Updated ${col.name}`,
                        });
                      }}

                      className="w-full mt-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-[#FF653F] outline-none text-sm"
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

      {/* 🔥 ADD RECORD MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-10 z-50 overflow-y-auto">

          <div className="bg-[#1A0F3A] border border-white/10 rounded-2xl shadow-2xl p-6 w-[1000px] max-w-[95vw]">

            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-[#FF653F] to-[#F2B95E] text-transparent bg-clip-text">
              Add New Record
            </h3>

            <div className="grid grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto pr-2">

              {columns.map((col) => (
                <div key={col.id} className="flex flex-col">

                  <label className="text-xs text-white/60 mb-1">
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
                    className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-[#FF653F] outline-none text-sm"
                  />
                </div>
              ))}

            </div>

            <div className="flex justify-end gap-3 mt-6">

              <button
                onClick={() => {
                  setShowAdd(false);
                  toast("Add Record Cancelled");
                }}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const t = toast.loading("Saving record...");

                  const success = await addRecord();

                  toast.dismiss(t);

                  if (success) {
                    toast.success("Record saved ✅");
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#FF653F] to-[#F2B95E] text-white rounded-lg shadow hover:scale-105 transition"
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