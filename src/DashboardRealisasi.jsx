import React, { useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "./lib/SupabaseSessionContext.jsx";
import { listPencairan, listPengeluaran } from "./lib/db.js";

const rupiah = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const pct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1) : "0.0") + "%";

// Presentational + fetch tipis: `subtotal`/`totalKeseluruhan` (rencana RAB)
// datang sebagai props dari App (sudah dihitung di sana, dijumlahkan dari
// semua tahun karena Pengeluaran tidak dipecah per tahun). Realisasi
// (pengeluaran & pencairan_dana) diambil sendiri lewat useSupabaseSession().
export default function DashboardRealisasi({ subtotal, totalKeseluruhan, categories, categoryMeta }) {
  const { penelitianId } = useSupabaseSession();
  const [status, setStatus] = useState("loading");
  const [pencairan, setPencairan] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!penelitianId) {
      setStatus("no-session");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    Promise.all([listPencairan(penelitianId), listPengeluaran(penelitianId)])
      .then(([pc, pg]) => {
        if (cancelled) return;
        setPencairan(pc);
        setPengeluaran(pg);
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

  const danaDiterima = useMemo(
    () => pencairan.filter((p) => p.status === "diterima").reduce((a, p) => a + Number(p.nominal || 0), 0),
    [pencairan]
  );
  const totalRealisasi = useMemo(() => pengeluaran.reduce((a, p) => a + Number(p.nominal || 0), 0), [pengeluaran]);
  const sisaKas = danaDiterima - totalRealisasi;
  const persenTerpakai = totalKeseluruhan > 0 ? totalRealisasi / totalKeseluruhan : 0;

  const realisasiPerKategori = useMemo(() => {
    const out = {};
    for (const p of pengeluaran) out[p.kategori] = (out[p.kategori] || 0) + Number(p.nominal || 0);
    return out;
  }, [pengeluaran]);

  if (status === "no-session") return null;
  if (status === "loading") return <section style={card}>Memuat data realisasi…</section>;
  if (status === "error") {
    return (
      <section style={card}>
        <p style={{ margin: "0 0 10px" }}>Gagal memuat realisasi: {errorMsg}</p>
        <button
          onClick={() => setRetryToken((t) => t + 1)}
          style={{ border: "1.5px solid #E4DCCF", background: "#fff", padding: "7px 13px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", color: "#6B6252" }}
        >
          Coba lagi
        </button>
      </section>
    );
  }

  const maxNilai = Math.max(
    1,
    ...categories.map((c) => Math.max(subtotal[c.id] || 0, realisasiPerKategori[c.id] || 0))
  );

  return (
    <>
      <section className="grid-3col">
        <StatCard label="Total Anggaran (RAB)" value={rupiah(totalKeseluruhan)} />
        <StatCard
          label="Dana Diterima"
          value={rupiah(danaDiterima)}
          sub={`${pct(totalKeseluruhan > 0 ? danaDiterima / totalKeseluruhan : 0)} dari total`}
        />
        <StatCard label="Realisasi" value={rupiah(totalRealisasi)} sub={`${pct(persenTerpakai)} anggaran terpakai`} />
      </section>

      <section className="card-hover" style={card}>
        <div style={metricLbl}>Anggaran vs Realisasi per Kelompok</div>
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          {categories.map((cat) => {
            const rencana = subtotal[cat.id] || 0;
            const real = realisasiPerKategori[cat.id] || 0;
            return (
              <div key={cat.id}>
                <div style={{ fontSize: 12.5, marginBottom: 4, color: "#4A4236" }}>
                  {categoryMeta[cat.id]?.icon} {cat.title.replace(/^\d+\.\s*/, "")}
                </div>
                <BarRow label="RAB" value={rencana} max={maxNilai} color="#C9BC9E" text={rupiah(rencana)} />
                <BarRow label="Realisasi" value={real} max={maxNilai} color={categoryMeta[cat.id]?.color || "#1B5E4F"} text={rupiah(real)} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="card-hover" style={card}>
        <div style={metricLbl}>Kesehatan Anggaran</div>
        <div style={{
          background: sisaKas >= 0 ? "#EAF4EF" : "#FDF2EF", borderRadius: 12, padding: "16px 18px",
          textAlign: "center", marginTop: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8A7A5C", textTransform: "uppercase" }}>
            Sisa Kas (dana di tangan)
          </div>
          <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 26, color: sisaKas >= 0 ? "#1B5E4F" : "#A23B23" }}>
            {rupiah(sisaKas)}
          </div>
          <div style={{ fontSize: 11.5, color: "#8A7A5C" }}>Dana Diterima − Realisasi</div>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <MetricRow label="Dana Diterima" value={pct(totalKeseluruhan > 0 ? danaDiterima / totalKeseluruhan : 0)} sub={`${rupiah(danaDiterima)} dari ${rupiah(totalKeseluruhan)}`} />
          <MetricRow label="Anggaran Terpakai" value={pct(persenTerpakai)} sub={`${rupiah(totalRealisasi)} terealisasi`} />
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 16, textAlign: "center", flexWrap: "wrap" }}>
          <CountBox n={pengeluaran.length} label="Pengeluaran" />
          <CountBox n={pencairan.length} label="Pencairan" />
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card-hover" style={card}>
      <div style={metricLbl}>{label}</div>
      <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 22, color: "#2A241C" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#8A7A5C", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BarRow({ label, value, max, color, text }) {
  const frac = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
      <span style={{ fontSize: 10.5, color: "#8A7A5C", width: 56, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: "#EDE7DE", height: 10, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${frac * 100}%`, height: "100%", background: color, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "#4A4236", width: 110, textAlign: "right", flexShrink: 0 }}>{text}</span>
    </div>
  );
}

function MetricRow({ label, value, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13 }}>
      <span style={{ color: "#4A4236" }}>{label}</span>
      <span>
        <strong>{value}</strong>
        <span style={{ fontSize: 11.5, color: "#8A7A5C", marginLeft: 6 }}>{sub}</span>
      </span>
    </div>
  );
}

function CountBox({ n, label }) {
  return (
    <div style={{ flex: "1 1 100px" }}>
      <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 20, color: "#2A241C" }}>{n}</div>
      <div style={{ fontSize: 11, color: "#8A7A5C" }}>{label}</div>
    </div>
  );
}

const card = {
  background: "#fff", borderRadius: 16, padding: "22px 24px",
  boxShadow: "0 1px 3px rgba(60,50,30,.06), 0 8px 24px rgba(60,50,30,.04)",
  border: "1px solid #F0EADF",
};
const metricLbl = { fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#8A7A5C", marginBottom: 6 };
