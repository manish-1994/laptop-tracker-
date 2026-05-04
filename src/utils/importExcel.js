import * as XLSX from "xlsx";
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";

export const importExcel = async (file) => {
  if (!file) return;

  const t = toast.loading("Importing Excel... 📥");

  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);

    console.log("📦 Import started");

    for (let sheetName of wb.SheetNames) {
      console.log("➡️ Sheet:", sheetName);

      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (!raw || raw.length === 0) continue;

      const headerRow = raw.find((r) =>
        r.some((c) => c !== null && c !== "")
      );

      if (!headerRow) continue;

      // 🔥 CLEAN HEADERS
      let headers = headerRow.map((h, i) => {
        const val = String(h || "").trim();
        return val !== "" ? val : `Unnamed_${i}`;
      });

      const seen = {};
      headers = headers.map((h) => {
        if (!seen[h]) {
          seen[h] = 1;
          return h;
        }
        return `${h}_${seen[h]++}`;
      });

      console.log("Headers:", headers);

      const dataRows = raw.slice(raw.indexOf(headerRow) + 1);

      // 🔥 CREATE SHEET
      const { data: newSheet, error: sheetError } = await supabase
        .from("sheets")
        .insert({ name: sheetName })
        .select()
        .single();

      if (sheetError) {
        console.error("❌ Sheet error:", sheetError);
        continue;
      }

      const sheetId = newSheet.id;

      // 🔥 INSERT COLUMNS
      const columns = headers.map((h) => ({
        sheet_id: sheetId,
        name: h,
        type: "text",
      }));

      const { error: colError } = await supabase
        .from("columns")
        .insert(columns);

      if (colError) {
        console.error("❌ Column error:", colError);
        continue;
      }

      console.log("✅ Columns inserted");

      // 🔥 PREP ROWS
      const rows = dataRows
        .filter((r) => r.some((c) => c !== null && c !== ""))
        .map((r) => {
          let obj = {};
          headers.forEach((h, i) => {
            obj[h] = r[i] ?? "";
          });

          return {
            sheet_id: sheetId,
            data: obj,
          };
        });

      console.log("Rows prepared:", rows.length);

      // 🔥 INSERT IN BATCHES
      const BATCH_SIZE = 50;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        const { error: rowError } = await supabase
          .from("rows")
          .insert(batch);

        if (rowError) {
          console.error("❌ Row batch error:", rowError);
        } else {
          console.log(`✅ Batch inserted ${i} - ${i + batch.length}`);
        }
      }

      console.log("🎉 Sheet complete:", sheetName);
    }

    // 🔥 SUCCESS TOAST
    toast.success("Excel Imported Successfully ✅", { id: t });

setTimeout(() => {
  window.location.reload();
}, 1200);

  } catch (err) {
    console.error("❌ IMPORT FAILED:", err);

    // 🔥 ERROR TOAST
    toast.error("Import Failed ❌", { id: t });
  }
};