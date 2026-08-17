import React, { createContext, useContext } from "react";
import { supabase } from "./supabaseClient.js";

const SupabaseSessionContext = createContext(null);

// value: { session, penelitianId }. Client Supabase selalu diambil dari
// modul supabaseClient.js langsung (bukan lewat context) supaya mudah
// di-mock lewat vi.mock('.../lib/supabaseClient.js') di test komponen anak
// tanpa harus membungkus tiap test dengan Provider yang sesungguhnya.
export function SupabaseSessionProvider({ session, penelitianId, children }) {
  return (
    <SupabaseSessionContext.Provider value={{ supabase, session, penelitianId }}>
      {children}
    </SupabaseSessionContext.Provider>
  );
}

// Sengaja TIDAK throw kalau tidak ada Provider di atasnya (mis. <App/>
// dirender berdiri sendiri di tes tanpa AuthGate) — mengembalikan
// penelitianId: null, supaya komponen pemanggil (DashboardRealisasi, dst.)
// bisa menampilkan status "belum terhubung" alih-alih meledak duluan
// sebelum sempat memutuskan mau menampilkan apa.
const FALLBACK = { supabase: null, session: null, penelitianId: null };
export function useSupabaseSession() {
  const ctx = useContext(SupabaseSessionContext);
  return ctx || FALLBACK;
}
