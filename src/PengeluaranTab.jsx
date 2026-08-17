import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSupabaseSession } from "./lib/SupabaseSessionContext.jsx";
import { listPengeluaran, addPengeluaran, updatePengeluaran, deletePengeluaran, createDebouncedSaver } from "./lib/db.js";

const rupiah = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");

// `categories` diterima sebagai prop (bukan diimpor dari rab-hibah.jsx)
// supaya tidak terjadi circular import: rab-hibah.jsx me-render
// <PengeluaranTab> dan meneruskan CATEGORIES miliknya sendiri sebagai prop.
export default function PengeluaranTab({ categories }) {
  const catLabel = (id) => (categories.find((c) => c.id === id)?.title || id).replace(/^\d+\.\s*/, "");
  const { penelitianId } = useSupabaseSession();
  const [status, setStatus] = useState("loading");
  const [rows, setRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const saversRef = useRef(new Map());

  useEffect(() => {
    if (!penelitianId) {
      setStatus("no-session");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    listPengeluaran(penelitianId)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err.message || String(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [penelitianId, retryToken]);

  const getSaver = (id) => {
    if (!saversRef.current.has(id)) {
      saversRef.current.set(id, createDebouncedSaver((patch) => updatePengeluaran(id, patch), 600));
    }
    return saversRef.current.get(id);
  };

  const updateField = (id, fieldName, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [fieldName]: value } : r)));
    getSaver(id)({ [fieldName]: value });
  };

  const addRow = async () => {
    try {
      const created = await addPengeluaran(penelitianId, { kategori: categories[0].id, uraian: "", nominal: 0 });
      setRows((prev) => [...prev, created]);
    } catch (err) {
      window.alert("Gagal menambah pengeluaran: " + (err.message || err));
    }
  };

  const removeRow = async (id, uraian) => {
    if (!window.confirm(`Hapus catatan pengeluaran "${uraian || "ini"}"?`)) return;
    const prevRows = rows;
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      await deletePengeluaran(id);
    } catch (err) {
      window.alert("Gagal menghapus: " + (err.message || err));
      setRows(prevRows);
    }
  };

  const total = useMemo(() => rows.reduce((a, r) => a + Number(r.nominal || 0), 0), [rows]);

  if (status === "no-session") return <section style={card}>Masuk ke akun Anda untuk melihat pengeluaran.</section>;
  if (status === "loading") return <section style={card}>Memuat data pengeluaran…</section>;
  if (status === "error") {
    return (
      <section style={card}>
        <p style={{ margin: "0 0 10px" }}>Gagal memuat pengeluaran: {errorMsg}</p>
        <button onClick={() => setRetryToken((t) => t + 1)} style={btnGhost}>Coba lagi</button>
      </section>
    );
  }

  return (
    <section style={card}>
      <h2 style={heading}>Pengeluaran</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Kelompok</th>
              <th style={th}>Uraian</th>
              <th style={th}>Nominal (Rp)</th>
              <th style={th}>Tanggal</th>
              <th style={th}>Catatan</th>
              <th style={th} className="no-print" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>
                  <select style={inputCell} aria-label="Kelompok" value={r.kategori} onChange={(e) => updateField(r.id, "kategori", e.target.value)}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{catLabel(c.id)}</option>
                    ))}
                  </select>
                </td>
                <td style={td}>
                  <input style={inputCell} aria-label="Uraian" value={r.uraian || ""} onChange={(e) => updateField(r.id, "uraian", e.target.value)} />
                </td>
                <td style={td}>
                  <input
                    style={{ ...inputCell, textAlign: "right" }} type="number" min="0" aria-label="Nominal"
                    value={r.nominal ?? 0} onChange={(e) => updateField(r.id, "nominal", Number(e.target.value))}
                  />
                </td>
                <td style={td}>
                  <input style={inputCell} type="date" aria-label="Tanggal" value={r.tanggal || ""} onChange={(e) => updateField(r.id, "tanggal", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={inputCell} aria-label="Catatan" value={r.catatan || ""} onChange={(e) => updateField(r.id, "catatan", e.target.value)} />
                </td>
                <td style={td} className="no-print">
                  <button onClick={() => removeRow(r.id, r.uraian)} aria-label={`Hapus pengeluaran ${r.uraian || ""}`} style={btnRemove}>×</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: "center", color: "#8A7A5C" }}>Belum ada catatan pengeluaran.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="no-print" style={btnGhost}>+ Tambah Pengeluaran</button>
      <div style={{ marginTop: 16, fontWeight: 700 }}>Total Pengeluaran: {rupiah(total)}</div>
    </section>
  );
}

const card = {
  background: "#fff", borderRadius: 16, padding: "22px 24px",
  boxShadow: "0 1px 3px rgba(60,50,30,.06), 0 8px 24px rgba(60,50,30,.04)",
  border: "1px solid #F0EADF",
};
const heading = { fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, margin: "0 0 16px" };
const table = { borderCollapse: "collapse", width: "100%", minWidth: 720 };
const th = {
  fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#8A7A5C",
  textAlign: "center", padding: "6px 6px", borderBottom: "2px solid #E4DCCF",
};
const td = { fontSize: 13, textAlign: "center", padding: "6px 6px", borderBottom: "1px solid #F0EADF" };
const inputCell = {
  width: "100%", padding: "6px 8px", borderRadius: 6, border: "1.5px solid #E4DCCF",
  fontSize: 13, fontFamily: "inherit", background: "#FBF8F2", color: "#2A241C",
};
const btnGhost = {
  border: "1.5px solid #E4DCCF", background: "#fff", padding: "7px 13px", borderRadius: 8,
  fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", color: "#6B6252", marginTop: 8,
};
const btnRemove = {
  border: "none", background: "transparent", color: "#A23B23", fontSize: 16, fontWeight: 700,
  cursor: "pointer", lineHeight: 1, padding: "2px 6px",
};
