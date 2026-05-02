import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("viewer");

  localStorage.setItem("user", JSON.stringify(user));

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      setRole(profile?.role || "viewer");
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return { user, role, logout };
}