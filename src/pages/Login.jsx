import { useState } from "react";
import { supabase } from "../services/supabase";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    localStorage.setItem("user", JSON.stringify(profile));
    setUser(profile);
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-cyan-500 to-indigo-600">

    {/* GLASS CARD */}
    <div className="w-[360px] p-8 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">

      {/* ICON */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 flex items-center justify-center rounded-full border border-white/30">
          <span className="text-white text-2xl">🔒</span>
        </div>
      </div>

      {/* TITLE */}
      <h2 className="text-center text-white text-lg tracking-widest mb-6">
        USER LOGIN
      </h2>

      {/* EMAIL */}
      <input
        type="email"
        placeholder="Email ID"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-transparent border-b border-white/40 text-white placeholder-white/60 px-2 py-2 mb-4 focus:outline-none focus:border-white focus:shadow-[0_0_10px_rgba(255,255,255,0.4)] transition"
      />

      {/* PASSWORD */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-transparent border-b border-white/40 text-white placeholder-white/60 px-2 py-2 mb-6 focus:outline-none focus:border-white focus:shadow-[0_0_10px_rgba(255,255,255,0.4)] transition"
      />

      {/* BUTTON */}
      <button
        onClick={login}  
        className="w-full py-2 rounded-lg bg-black/80 text-white tracking-wider hover:bg-black transition"
      >
        LOGIN
      </button>

    </div>
  </div>
);
}