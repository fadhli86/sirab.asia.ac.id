import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";
import {
  getOrCreateMyPenelitian,
  fetchRabItems,
  groupRabItemsByYear,
  flattenRabItemsForSave,
  updatePenelitian,
  saveRabItems,
  createDebouncedSaver,
} from "./lib/db.js";
import { SupabaseSessionProvider } from "./lib/SupabaseSessionContext.jsx";
import App, { CATEGORIES } from "../rab-hibah.jsx";

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

function buildOnSync(penelitianId) {
  return createDebouncedSaver(async (state) => {
    await Promise.all([
      updatePenelitian(penelitianId, {
        skema_id: state.skemaId,
        jumlah_tahun: state.jumlahTahun,
        program_studi: state.progStudi,
        nama_ketua: state.namaKetua,
        pagu_kustom: state.paguKustom,
        pagu_min_kustom: state.paguMinKustom === "" || state.paguMinKustom == null ? null : Number(state.paguMinKustom),
        pagu_max_kustom: state.paguMaxKustom === "" || state.paguMaxKustom == null ? null : Number(state.paguMaxKustom),
      }),
      saveRabItems(penelitianId, flattenRabItemsForSave(state.itemsByTahun, CATEGORY_IDS)),
    ]);
  }, 800);
}

function CenteredMessage({ children, error }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        background: "#FBF8F2",
        color: error ? "#A23B23" : "#2A241C",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>{children}</div>
    </div>
  );
}

const field = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid #E4DCCF",
  fontSize: 14,
  fontFamily: "inherit",
  background: "#FBF8F2",
  color: "#2A241C",
  marginTop: 6,
};
const label = { display: "block", fontSize: 12.5, fontWeight: 700, color: "#6B6252", marginTop: 14 };
const primaryButton = {
  width: "100%",
  marginTop: 20,
  padding: "11px 16px",
  borderRadius: 8,
  border: "1.5px solid #2D3561",
  background: "#2D3561",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
const linkButton = {
  background: "none",
  border: "none",
  color: "#2D3561",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  textDecoration: "underline",
};

// Terjemahan pesan error Supabase Auth yang paling umum ditemui pengguna —
// selain daftar ini, pesan asli (Inggris) dari Supabase tetap ditampilkan
// apa adanya daripada menerjemahkan seluruh kemungkinan pesan secara manual.
const AUTH_ERROR_ID = {
  "Invalid login credentials": "Email atau password salah.",
  "User already registered": "Email ini sudah terdaftar. Coba masuk, atau gunakan \"Lupa password?\".",
  "Email not confirmed": "Email belum dikonfirmasi. Cek inbox Anda untuk link konfirmasi.",
  "Password should be at least 6 characters": "Password minimal 6 karakter.",
};
const translateAuthError = (message) => AUTH_ERROR_ID[message] || message;

function SetNewPasswordForm({ onDone }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      onDone();
    } catch (err) {
      setError(translateAuthError(err.message) || "Gagal mengganti password, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', system-ui, sans-serif", background: "#FBF8F2", padding: 24,
    }}>
      <form
        onSubmit={submit}
        style={{
          width: "100%", maxWidth: 380, background: "#fff", borderRadius: 16, padding: "28px 26px",
          boxShadow: "0 1px 3px rgba(60,50,30,.06), 0 8px 24px rgba(60,50,30,.04)", border: "1px solid #F0EADF",
        }}
      >
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, margin: "0 0 4px" }}>Atur Password Baru</h1>
        <p style={{ fontSize: 13, color: "#8A7A5C", margin: 0 }}>
          Masukkan password baru untuk akun Anda.
        </p>
        <label style={label} htmlFor="new-password">Password Baru</label>
        <input
          id="new-password" type="password" style={field} value={password}
          onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
        />
        {error && <p style={{ color: "#A23B23", fontSize: 12.5, marginTop: 12, marginBottom: 0 }}>{error}</p>}
        <button type="submit" style={{ ...primaryButton, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
          {submitting ? "Menyimpan…" : "Simpan Password Baru"}
        </button>
      </form>
    </div>
  );
}

function LoginForm() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nama_lengkap: namaLengkap } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          // "Confirm email" aktif di project ini — belum ada sesi sampai
          // pengguna klik link konfirmasi di emailnya.
          setPendingConfirmEmail(email);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(translateAuthError(err.message) || "Terjadi kesalahan, coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const kirimResetPassword = async () => {
    if (!email) {
      setError("Isi email terlebih dahulu untuk reset password.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err) {
      setError(translateAuthError(err.message) || "Gagal mengirim email reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (pendingConfirmEmail) {
    return (
      <CenteredMessage>
        <h1 style={{ fontSize: 20, marginBottom: 10 }}>Cek email Anda</h1>
        <p style={{ fontSize: 14, color: "#6B6252", lineHeight: 1.6 }}>
          Kami mengirim link konfirmasi ke <strong>{pendingConfirmEmail}</strong>. Klik link tersebut untuk
          mengaktifkan akun, lalu masuk kembali di halaman ini.
        </p>
        <button type="button" style={{ ...linkButton, marginTop: 16 }} onClick={() => setPendingConfirmEmail("")}>
          Kembali ke halaman masuk
        </button>
      </CenteredMessage>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: "#FBF8F2",
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          borderRadius: 16,
          padding: "28px 26px",
          boxShadow: "0 1px 3px rgba(60,50,30,.06), 0 8px 24px rgba(60,50,30,.04)",
          border: "1px solid #F0EADF",
        }}
      >
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#8A7A5C" }}>
          Sistem RAB Hibah
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, margin: "4px 0 4px" }}>
          {mode === "login" ? "Masuk ke akun Anda" : "Buat akun baru"}
        </h1>
        <p style={{ fontSize: 13, color: "#8A7A5C", margin: 0 }}>
          {mode === "login" ? "Login diperlukan untuk mengakses RAB, Pencairan Dana, dan Pengeluaran." : "Data Anda tersimpan di akun pribadi, terpisah dari akun lain."}
        </p>

        {mode === "signup" && (
          <div>
            <label style={label} htmlFor="auth-nama">Nama Lengkap</label>
            <input id="auth-nama" style={field} value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} required />
          </div>
        )}
        <div>
          <label style={label} htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" style={field} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div>
          <label style={label} htmlFor="auth-password">Password</label>
          <input
            id="auth-password" type="password" style={field} value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {error && <p style={{ color: "#A23B23", fontSize: 12.5, marginTop: 12, marginBottom: 0 }}>{error}</p>}
        {resetSent && <p style={{ color: "#2D3561", fontSize: 12.5, marginTop: 12, marginBottom: 0 }}>Email reset password terkirim, cek inbox Anda.</p>}

        <button type="submit" style={{ ...primaryButton, opacity: submitting ? 0.7 : 1 }} disabled={submitting}>
          {submitting ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
          <button
            type="button" style={linkButton}
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          >
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
          {mode === "login" && (
            <button type="button" style={linkButton} onClick={kirimResetPassword}>
              Lupa password?
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = belum dicek, null = tidak ada sesi
  const [dataState, setDataState] = useState({ status: "idle" });
  // Klik link "lupa password" dari email membuat Supabase langsung membuat
  // sesi (PASSWORD_RECOVERY) — kalau tidak ditangani khusus, pengguna akan
  // langsung masuk ke aplikasi TANPA pernah diminta mengatur password baru.
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setDataState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setDataState({ status: "loading" });
    (async () => {
      try {
        const penelitian = await getOrCreateMyPenelitian(session);
        const rows = await fetchRabItems(penelitian.id);
        if (cancelled) return;
        setDataState({
          status: "ready",
          penelitianId: penelitian.id,
          initialRemote: {
            skemaId: penelitian.skema_id,
            jumlahTahun: penelitian.jumlah_tahun,
            progStudi: penelitian.program_studi,
            namaKetua: penelitian.nama_ketua,
            paguKustom: penelitian.pagu_kustom,
            paguMinKustom: penelitian.pagu_min_kustom != null ? String(penelitian.pagu_min_kustom) : undefined,
            paguMaxKustom: penelitian.pagu_max_kustom != null ? String(penelitian.pagu_max_kustom) : undefined,
            itemsByTahun: groupRabItemsByYear(rows, penelitian.jumlah_tahun, CATEGORY_IDS),
          },
        });
      } catch (err) {
        if (!cancelled) setDataState({ status: "error", message: err.message || String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const onSync = useMemo(
    () => (dataState.status === "ready" ? buildOnSync(dataState.penelitianId) : null),
    [dataState.status, dataState.penelitianId]
  );

  if (session === undefined) {
    return <CenteredMessage>Memeriksa sesi login…</CenteredMessage>;
  }
  if (recoveryMode) {
    return <SetNewPasswordForm onDone={() => setRecoveryMode(false)} />;
  }
  if (!session) {
    return <LoginForm />;
  }
  if (dataState.status === "loading" || dataState.status === "idle") {
    return <CenteredMessage>Memuat data RAB Anda…</CenteredMessage>;
  }
  if (dataState.status === "error") {
    return (
      <CenteredMessage error>
        <p>Gagal memuat data: {dataState.message}</p>
        <button type="button" style={linkButton} onClick={() => setSession({ ...session })}>
          Coba lagi
        </button>
      </CenteredMessage>
    );
  }

  return (
    <SupabaseSessionProvider session={session} penelitianId={dataState.penelitianId}>
      <App
        initialRemote={dataState.initialRemote}
        onSync={onSync}
        userEmail={session.user.email}
        onLogout={() => supabase.auth.signOut()}
      />
    </SupabaseSessionProvider>
  );
}
