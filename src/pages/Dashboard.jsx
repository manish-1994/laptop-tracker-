import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#4F46E5", "#22C55E", "#F59E0B", "#EF4444"];

export default function Dashboard() {
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [config, setConfig] = useState(null);
  const [chartData, setChartData] = useState([]);

  const [stats, setStats] = useState({
    assigned: 0,
    unassigned: 0,
    returned: 0,
    other: 0,
  });

  useEffect(() => {
    loadSheets();
  }, []);

  useEffect(() => {
    if (selectedSheet) loadData(selectedSheet);
  }, [selectedSheet]);

  const loadSheets = async () => {
    const { data } = await supabase.from("sheets").select("*");
    setSheets(data || []);
    if (data?.length) setSelectedSheet(data[0].id);
  };

  const loadData = async (sheetId) => {
    const { data: rowData } = await supabase
      .from("rows")
      .select("*")
      .eq("sheet_id", sheetId);

    const { data: colData } = await supabase
      .from("columns")
      .select("*")
      .eq("sheet_id", sheetId);

    const { data: configData } = await supabase
      .from("dashboard_config")
      .select("*")
      .eq("sheet_id", sheetId)
      .single();

    setRows(rowData || []);
    setColumns(colData || []);
    setConfig(configData || null);

    processStats(rowData || [], colData || [], configData);
    buildChart(rowData || [], colData || [], configData);
  };

  // -------------------------
  // HELPERS
  // -------------------------
  const normalizeKey = (str) =>
    (str || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

  const normalizeValue = (str) =>
    (str || "")
      .toString()
      .trim()
      .toLowerCase();

  const getActiveColumn = (columns, config) => {
    let col = columns.find((c) => c.name.startsWith("@"));

    if (!col && config?.chart_column) {
      col = columns.find((c) => c.name === config.chart_column);
    }

    return col;
  };

  // -------------------------
  // 🚀 FINAL FIXED CLASSIFIER
  // -------------------------
  const classify = (val) => {
    if (!val || val === "-" || val === "na") return "Unassigned";

    // ✅ VERY IMPORTANT ORDER FIX
    if (val.includes("unassigned")) return "Unassigned";

    if (val.includes("assign") || val.includes("issue"))
      return "Assigned";

    if (
      val.includes("available") ||
      val.includes("avail") ||
      val.includes("stock")
    )
      return "Unassigned";

    if (val.includes("return")) return "Returned";

    return "Other";
  };

  // -------------------------
  // STATS
  // -------------------------
  const processStats = (rows, columns, config) => {
    const col = getActiveColumn(columns, config);
    if (!col) {
      setStats({ assigned: 0, unassigned: 0, returned: 0, other: 0 });
      return;
    }

    const name = col.name;

    let assigned = 0;
    let unassigned = 0;
    let returned = 0;
    let other = 0;

    rows.forEach((r) => {
      const key = Object.keys(r.data || {}).find(
        (k) => normalizeKey(k) === normalizeKey(name)
      );

      const val = normalizeValue(r.data?.[key]);

      const type = classify(val);

      if (type === "Assigned") assigned++;
      else if (type === "Unassigned") unassigned++;
      else if (type === "Returned") returned++;
      else other++;
    });

    setStats({ assigned, unassigned, returned, other });
  };

  // -------------------------
  // CHART
  // -------------------------
  const buildChart = (rows, columns, config) => {
    const col = getActiveColumn(columns, config);
    if (!col) {
      setChartData([]);
      return;
    }

    const name = col.name;
    const map = {};

    rows.forEach((r) => {
      const key = Object.keys(r.data || {}).find(
        (k) => normalizeKey(k) === normalizeKey(name)
      );

      const val = normalizeValue(r.data?.[key]);

      const type = classify(val);

      map[type] = (map[type] || 0) + 1;
    });

    const formatted = Object.keys(map).map((key) => ({
      name: key,
      value: map[key],
    }));

    setChartData(formatted);
  };

  // -------------------------
  // UI
  // -------------------------
  return (
  <div className="p-6 space-y-6 text-white">

    {/* HEADER */}
    <div className="flex items-center gap-6">
      <h1 className="title">
        Dashboard
      </h1>

      <select
        value={selectedSheet}
        onChange={(e) => setSelectedSheet(e.target.value)}
        className="input w-64"
      >
        {sheets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>

    {/* ACTIVE COLUMN */}
    <div className="glass p-4 flex justify-between items-center">
      <p className="subtext">
        Active Column:
      </p>
      <span className="font-semibold text-[#F2B95E]">
        {config?.chart_column || "Auto (@)"}
      </span>
    </div>

    {/* STATS */}
    <div className="grid grid-cols-4 gap-5">

      <div className="glass p-5 flex flex-col items-center hover:scale-105 transition">
        <span className="text-sm subtext">Assigned</span>
        <span className="text-3xl font-bold text-[#F2B95E]">
          {stats.assigned}
        </span>
      </div>

      <div className="glass p-5 flex flex-col items-center hover:scale-105 transition">
        <span className="text-sm subtext">Unassigned</span>
        <span className="text-3xl font-bold text-[#FF653F]">
          {stats.unassigned}
        </span>
      </div>

      <div className="glass p-5 flex flex-col items-center hover:scale-105 transition">
        <span className="text-sm subtext">Returned</span>
        <span className="text-3xl font-bold text-white">
          {stats.returned}
        </span>
      </div>

      <div className="glass p-5 flex flex-col items-center hover:scale-105 transition">
        <span className="text-sm subtext">Other</span>
        <span className="text-3xl font-bold text-white/70">
          {stats.other}
        </span>
      </div>

    </div>

    {/* CHART */}
    <div className="glass p-6">

      <h2 className="mb-5 font-semibold subtext">
        Analytics Overview
      </h2>

      {chartData.length === 0 ? (
        <p className="text-[#FF653F]">
          No chart data. Configure column in Admin Panel.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6">

          {/* PIE */}
          <div className="glass p-4 flex flex-col items-center">
            <h3 className="mb-3 text-sm subtext">
              Pie Chart
            </h3>

            <PieChart width={320} height={260}>
              <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>

          {/* BAR */}
          <div className="glass p-4 flex flex-col items-center">
            <h3 className="mb-3 text-sm subtext">
              Bar Chart
            </h3>

            <BarChart width={350} height={260} data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="name" stroke="#ffffff80" />
              <YAxis stroke="#ffffff80" />
              <Tooltip />
              <Bar dataKey="value" fill="#FF653F" />
            </BarChart>
          </div>

        </div>
      )}
    </div>

  </div>
);
}

// -------------------------
function Card({ title, value, color }) {
  return (
    <div className={`${color} text-white p-4 rounded-xl shadow`}>
      <p className="text-sm">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}