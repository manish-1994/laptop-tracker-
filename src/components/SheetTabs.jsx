import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function SheetTabs({ onSelect }) {
  const [sheets, setSheets] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    const { data } = await supabase.from("sheets").select("*");

    setSheets(data || []);

    if (data && data.length > 0) {
      setActive(data[0].id);
      onSelect(data[0].id);
    }
  };

  return (
  <div className="flex gap-2 flex-wrap">

    {sheets.map((s) => (
      <button
        key={s.id}
        onClick={() => {
          setActive(s.id);
          onSelect(s.id);
        }}
        className={`
          px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
          ${
            active === s.id
              ? "bg-gradient-to-r from-[#FF653F] to-[#F2B95E] text-white shadow-lg"
              : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
          }
        `}
      >
        {s.name}
      </button>
    ))}

  </div>
);
}