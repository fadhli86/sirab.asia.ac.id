import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Sengaja warn, bukan throw — supaya `vite build` tanpa secret (mis. build
  // PR fork) tetap sukses; kegagalan sesungguhnya baru muncul saat runtime
  // memanggil Supabase (ditangani oleh AuthGate).
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diset — fitur login & sinkronisasi data tidak akan berfungsi."
  );
}

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key");
