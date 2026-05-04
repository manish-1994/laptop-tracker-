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
  <div className="min-h-screen flex items-center justify-center app-bg">

    {/* GLASS CARD */}
    <div className="w-[360px] p-8 rounded-2xl backdrop-blur-xl bg-[#52366B]/50 border border-white/10 shadow-2xl">

      {/* ICON */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 flex items-center justify-center rounded-full border border-white/20 bg-white/10">
          <span className="text-2xl">🔒</span>
        </div>
      </div>

      {/* TITLE */}
      <h2 className="text-center text-lg tracking-widest mb-6 title">
        USER LOGIN
      </h2>

      {/* EMAIL */}
      <input
        type="email"
        placeholder="Email ID"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input mb-5"
      />

      {/* PASSWORD */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input mb-6"
      />

      {/* BUTTON */}
      <button
        onClick={login}
        className="w-full btn-primary tracking-wider"
      >
        LOGIN
      </button>

    </div>
  </div>
);
}