import React, { useState, useMemo, useEffect } from "react";

// ============================================================
// DATA REGULASI & TEMPLATE RAB ITEMIZED — diadaptasi dari berkas
// resource "RAB_Hibah_Semua_Skema" (xlsx/pdf): 7 komponen belanja
// baku, uraian & satuan default, serta harga satuan acuan per
// skema. Dasar: panduan DPPM Kemdiktisaintek TA 2026 (honorarium
// maks 25% SBM Kemenkeu), skema BESTARI/LPDP, RIKUB, dan program
// BRIN (RIIM & Degree by Research). Nilai bersifat acuan
// perencanaan; verifikasi ke panduan resmi & SBM/SBK terbaru
// sebelum submit proposal ke BIMA.
// ============================================================

const SUMBER = {
  diktisaintek: { nama: "Kemdiktisaintek (DPPM)", warna: "#1B5E4F" },
  brin: { nama: "BRIN", warna: "#7A3E1D" },
  umum: { nama: "Umum / Lainnya", warna: "#5B5240" },
};

// 7 komponen baku RAB penelitian (mengikuti struktur tab Excel resmi)
// habisPakai: true = dana habis pakai (consumable), false = tidak habis pakai (aset/peralatan)
const CATEGORIES = [
  { id: "honor", title: "1. Honorarium (Tim & Tenaga Penunjang)", habisPakai: true },
  { id: "bahan", title: "2. Belanja Bahan Penelitian", habisPakai: true },
  { id: "data", title: "3. Pengumpulan & Analisis Data", habisPakai: true },
  { id: "perjalanan", title: "4. Perjalanan Dinas", habisPakai: true },
  { id: "sewa", title: "5. Sewa Peralatan / Laboratorium", habisPakai: true },
  { id: "peralatan", title: "6. Peralatan Penunjang (Aset / Tidak Habis Pakai)", habisPakai: false },
  { id: "lain", title: "7. Pelaporan, Luaran & Publikasi", habisPakai: true },
];

// Uraian & satuan default per komponen — identik di semua skema pada
// berkas resource, hanya harga satuan yang dikalibrasi berbeda.
const ITEM_TEMPLATE = {
  honor: [
    { label: "Honorarium ketua peneliti", vol: 1, sat: "org", vol2: 8, sat2: "OB" },
    { label: "Honorarium anggota peneliti", vol: 2, sat: "org", vol2: 8, sat2: "OB" },
    { label: "Honorarium pengolah data", vol: 1, sat: "org", vol2: 1, sat2: "keg" },
    { label: "Honorarium pembantu lapangan", vol: 2, sat: "org", vol2: 20, sat2: "OH" },
  ],
  bahan: [
    { label: "Bahan habis pakai / reagen / komponen", vol: 1, sat: "paket", vol2: 1, sat2: "-" },
    { label: "Alat tulis kantor & pencetakan", vol: 1, sat: "paket", vol2: 1, sat2: "-" },
    { label: "Lisensi perangkat lunak / cloud", vol: 1, sat: "paket", vol2: 1, sat2: "-" },
  ],
  data: [
    { label: "Honor petugas survei / enumerator", vol: 1, sat: "OH", vol2: 1, sat2: "-" },
    { label: "Transkripsi & entri data", vol: 1, sat: "paket", vol2: 1, sat2: "-" },
    { label: "Analisis statistik / uji laboratorium", vol: 1, sat: "sampel", vol2: 1, sat2: "-" },
  ],
  perjalanan: [
    { label: "Transport pengumpulan data (lokal)", vol: 1, sat: "OH", vol2: 1, sat2: "-" },
    { label: "Perjalanan diseminasi / seminar hasil", vol: 1, sat: "OK", vol2: 1, sat2: "-" },
  ],
  sewa: [
    { label: "Sewa peralatan / instrumen", vol: 1, sat: "bulan", vol2: 1, sat2: "-" },
    { label: "Sewa ruang / laboratorium", vol: 1, sat: "keg", vol2: 1, sat2: "-" },
  ],
  peralatan: [
    { label: "Peralatan penunjang riset (aset)", vol: 1, sat: "unit", vol2: 1, sat2: "-" },
  ],
  lain: [
    { label: "Biaya publikasi jurnal (APC) / prosiding", vol: 1, sat: "artikel", vol2: 1, sat2: "-" },
    { label: "Penggandaan & penjilidan laporan", vol: 1, sat: "eks", vol2: 1, sat2: "-" },
    { label: "Luaran wajib (HKI / produk)", vol: 1, sat: "paket", vol2: 1, sat2: "-" },
  ],
};

// Harga satuan acuan (Rp) per skema, hasil kalibrasi template resmi agar
// proporsional terhadap pagu masing-masing skema. Urutan mengikuti ITEM_TEMPLATE.
const HARGA_ACUAN = {
  pfr: { honor: [1020000, 1020000, 3741000, 194475], bahan: [14000000, 14000000, 14000000], data: [7000000, 7000000, 7000000], perjalanan: [9000000, 9000000], sewa: [4500000, 4500000], peralatan: [12000000], lain: [4000000, 4000000, 4000000] },
  pktp: { honor: [1020000, 1020000, 3741000, 194475], bahan: [12000000, 12000000, 12000000], data: [7000000, 7000000, 7000000], perjalanan: [13500000, 13500000], sewa: [4500000, 4500000], peralatan: [9000000], lain: [4000000, 4000000, 4000000] },
  katalis: { honor: [3401000, 3401000, 12470000, 647650], bahan: [43333333, 43333333, 43333334], data: [23333333, 23333333, 23333334], perjalanan: [30000000, 30000000], sewa: [15000000, 15000000], peralatan: [50000000], lain: [13333333, 13333333, 13333334] },
  terapan: { honor: [1559000, 1559000, 5715000, 296725], bahan: [20000000, 20000000, 20000000], data: [10000000, 10000000, 10000000], perjalanan: [15000000, 15000000], sewa: [10000000, 10000000], peralatan: [35000000], lain: [6666666, 6666666, 6666668] },
  rikub: { honor: [4364000, 4364000, 16003000, 831525], bahan: [56000000, 56000000, 56000000], data: [28000000, 28000000, 28000000], perjalanan: [42000000, 42000000], sewa: [28000000, 28000000], peralatan: [98000000], lain: [18666666, 18666666, 18666668] },
  bestari: { honor: [5951000, 5951000, 21822000, 1133850], bahan: [55000000, 55000000, 55000000], data: [30000000, 30000000, 30000000], perjalanan: [45000000, 45000000], sewa: [22500000, 22500000], peralatan: [90000000], lain: [20000000, 20000000, 20000000] },
  brin_riim: { honor: [3117000, 3117000, 11430000, 594050], bahan: [36666666, 36666666, 36666668], data: [20000000, 20000000, 20000000], perjalanan: [25000000, 25000000], sewa: [20000000, 20000000], peralatan: [90000000], lain: [13333333, 13333333, 13333334] },
  brin_degree: { honor: [2891000, 2891000, 10599000, 550425], bahan: [20000000, 20000000, 20000000], data: [14000000, 14000000, 14000000], perjalanan: [15000000, 15000000], sewa: [9000000, 9000000], peralatan: [24000000], lain: [8000000, 8000000, 8000000] },
  umum: { honor: [0, 0, 0, 0], bahan: [0, 0, 0], data: [0, 0, 0], perjalanan: [0, 0], sewa: [0, 0], peralatan: [0], lain: [0, 0, 0] },
};

// Skema hibah nyata dengan pagu & batasan komponen
const SKEMA = [
  {
    id: "pfr", nama: "Penelitian Fundamental Reguler (PFR)", sumber: "diktisaintek",
    tkt: "Dasar · TKT 1–3", paguMin: 20_000_000, paguMax: 150_000_000, durasi: "1–2 thn",
    catatan: "Ketua min. jabatan Lektor & memiliki kepakaran. Luaran artikel jurnal internasional bereputasi.",
    batas: { honor: 0.25, peralatan: 0.30, perjalanan: 0.30 }, minHabisPakai: 0.60,
  },
  {
    id: "pktp", nama: "Penelitian Kerja Sama antar PT (PKPT)", sumber: "diktisaintek",
    tkt: "Dasar · TKT 1–3", paguMin: 50_000_000, paguMax: 150_000_000, durasi: "1–2 thn",
    catatan: "Kolaborasi TPP (Tim Peneliti Pengusul) & TPM (Tim Peneliti Mitra) beda PT.",
    batas: { honor: 0.25, peralatan: 0.30, perjalanan: 0.35 }, minHabisPakai: 0.60,
  },
  {
    id: "katalis", nama: "Kolaborasi Penelitian Strategis (KATALIS)", sumber: "diktisaintek",
    tkt: "Dasar · TKT 1–3", paguMin: 100_000_000, paguMax: 500_000_000, durasi: "2–3 thn",
    catatan: "Konsorsium strategis. Pendanaan besar, luaran dampak tinggi.",
    batas: { honor: 0.25, peralatan: 0.35, perjalanan: 0.30 }, minHabisPakai: 0.55,
  },
  {
    id: "terapan", nama: "Penelitian Terapan (Luaran Model/Produk)", sumber: "diktisaintek",
    tkt: "Terapan · TKT 4–6", paguMin: 50_000_000, paguMax: 250_000_000, durasi: "1–3 thn",
    catatan: "Luaran prototipe/produk. Wajib mitra & keterlibatan pengguna.",
    batas: { honor: 0.25, peralatan: 0.40, perjalanan: 0.30 }, minHabisPakai: 0.50,
  },
  {
    id: "rikub", nama: "Riset Kolaborasi Unggulan Berdampak (RIKUB)", sumber: "diktisaintek",
    tkt: "Terapan · TKT 4–7", paguMin: 200_000_000, paguMax: 700_000_000, durasi: "2–3 thn",
    catatan: "Konsorsium 2–5 tim beda PT + mitra industri. Orientasi hilirisasi.",
    batas: { honor: 0.25, peralatan: 0.40, perjalanan: 0.25 }, minHabisPakai: 0.50,
  },
  {
    id: "bestari", nama: "BESTARI Saintek (LPDP)", sumber: "diktisaintek",
    tkt: "Terapan berbasis potensi daerah", paguMin: 250_000_000, paguMax: 750_000_000, durasi: "≤12 bln",
    catatan: "Biaya langsung personil maks 30%. Kolaborasi mitra eksternal & potensi daerah.",
    batas: { honor: 0.30, peralatan: 0.40, perjalanan: 0.30 }, minHabisPakai: 0.45,
  },
  {
    id: "brin_riim", nama: "BRIN — RIIM (Riset & Inovasi untuk Indonesia Maju)", sumber: "brin",
    tkt: "Ekspedisi / Kompetitif", paguMin: 100_000_000, paguMax: 2_000_000_000, durasi: "1–3 thn",
    catatan: "Skema kompetitif BRIN. Belanja mengacu SBK/SBM Kemenkeu. Peralatan lab besar dimungkinkan.",
    batas: { honor: 0.25, peralatan: 0.45, perjalanan: 0.25 }, minHabisPakai: 0.45,
  },
  {
    id: "brin_degree", nama: "BRIN — Research Assistantship / Degree by Research", sumber: "brin",
    tkt: "Riset berbasis SDM", paguMin: 50_000_000, paguMax: 300_000_000, durasi: "1–2 thn",
    catatan: "Dominan honor asisten riset & operasional. Bobot personil relatif tinggi.",
    batas: { honor: 0.35, peralatan: 0.25, perjalanan: 0.25 }, minHabisPakai: 0.50,
  },
  {
    id: "umum", nama: "Skema Umum / Hibah Lainnya (Template Default)", sumber: "umum",
    tkt: "Menyesuaikan panduan hibah terkait", paguMin: 0, paguMax: 1_000_000_000, durasi: "Menyesuaikan",
    catatan: "Template default untuk hibah yang belum tersedia parameternya. Batas mengikuti kaidah umum: honor ≤25%, aset ≤35%, perjalanan ≤30%. Sesuaikan dengan panduan resmi hibah yang dituju.",
    batas: { honor: 0.25, peralatan: 0.35, perjalanan: 0.30 }, minHabisPakai: 0.50,
  },
];

const rupiah = (n) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const pct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1) : "0.0") + "%";

let rowSeq = 0;
const nextRowId = () => `r${++rowSeq}-${Math.random().toString(36).slice(2, 7)}`;

const buildDefaultItems = (skemaId) => {
  const harga = HARGA_ACUAN[skemaId] || HARGA_ACUAN.umum;
  const out = {};
  for (const cat of CATEGORIES) {
    const hargaCat = harga[cat.id] || [];
    out[cat.id] = ITEM_TEMPLATE[cat.id].map((it, idx) => ({
      id: nextRowId(),
      label: it.label,
      vol: it.vol,
      sat: it.sat,
      vol2: it.vol2,
      sat2: it.sat2,
      harga: hargaCat[idx] ?? 0,
    }));
  }
  return out;
};

const emptyRow = () => ({ id: nextRowId(), label: "", vol: 1, sat: "", vol2: 1, sat2: "-", harga: 0 });

const jumlahItem = (it) => (Number(it.vol) || 0) * (Number(it.vol2) || 1) * (Number(it.harga) || 0);

// ---- Impor CSV (round-trip dari hasil "Unduh CSV") ----
function parseCSVText(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\r") {
      // diabaikan, baris baru ditangani oleh \n
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v !== ""));
}

function importItemsFromRows(rows) {
  if (!rows.length) return null;
  const headerIdx = rows.findIndex((r) => {
    const low = r.map((c) => c.trim().toLowerCase());
    return low.includes("komponen") && low.includes("uraian");
  });
  if (headerIdx === -1) return null;
  const header = rows[headerIdx].map((h) => h.trim().toLowerCase());
  const idx = {
    komponen: header.indexOf("komponen"),
    uraian: header.indexOf("uraian"),
    vol: header.indexOf("vol"),
    sat: header.indexOf("sat"),
    vol2: header.indexOf("vol2"),
    sat2: header.indexOf("sat2"),
    harga: header.findIndex((h) => h.startsWith("harga satuan")),
  };

  const out = {};
  for (const cat of CATEGORIES) out[cat.id] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    const komponen = (row[idx.komponen] || "").trim();
    const uraian = (row[idx.uraian] || "").trim();
    if (!komponen || !uraian) continue;
    if (uraian.startsWith("Subtotal") || uraian.startsWith("TOTAL RENCANA")) continue;
    const cat = CATEGORIES.find((c) => c.title === komponen);
    if (!cat) continue;
    out[cat.id].push({
      id: nextRowId(),
      label: uraian,
      vol: clampNonNeg(row[idx.vol], 1),
      sat: row[idx.sat] ?? "",
      vol2: clampNonNeg(row[idx.vol2], 1),
      sat2: row[idx.sat2] ?? "-",
      harga: clampNonNeg(row[idx.harga], 0),
    });
  }

  let any = false;
  for (const cat of CATEGORIES) {
    if (out[cat.id].length === 0) out[cat.id] = [emptyRow()];
    else any = true;
  }
  return any ? out : null;
}

// Angka dari file impor tidak boleh negatif (mencegah CSV/Excel yang dimanipulasi
// menyisipkan Vol/Vol2/Harga negatif untuk menyamarkan total & lolos batas komponen).
function clampNonNeg(raw, fallback) {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

// Parser tabel HTML — dipakai untuk mengimpor kembali hasil "Unduh Excel (.xls)",
// karena file .xls yang dihasilkan sebenarnya berupa tabel HTML.
function parseHTMLTableText(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const table = doc.querySelector("table");
  if (!table) return [];
  const rows = [];
  for (const tr of table.querySelectorAll("tr")) {
    const cells = Array.from(tr.querySelectorAll("th,td")).map((c) => c.textContent.trim());
    if (cells.some((v) => v !== "")) rows.push(cells);
  }
  return rows;
}

// ---- Auto-save draft ke localStorage, supaya isian tidak hilang saat reload ----
const STORAGE_KEY = "rab-hibah-draft-v1";
function loadDraft() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
const initialDraft = loadDraft();

export default function App() {
  const [skemaId, setSkemaId] = useState(initialDraft?.skemaId || "pfr");
  const [items, setItems] = useState(() => initialDraft?.items || buildDefaultItems(initialDraft?.skemaId || "pfr"));
  const [progStudi, setProgStudi] = useState(initialDraft?.progStudi ?? "Teknik Informatika – ITB Asia Malang");
  const [namaKetua, setNamaKetua] = useState(initialDraft?.namaKetua ?? "");
  const [targetDana, setTargetDana] = useState("");
  const [tersimpan, setTersimpan] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ skemaId, items, progStudi, namaKetua }));
      setTersimpan(true);
      const t = setTimeout(() => setTersimpan(false), 1500);
      return () => clearTimeout(t);
    } catch {
      /* localStorage tidak tersedia — abaikan */
    }
  }, [skemaId, items, progStudi, namaKetua]);

  const skema = useMemo(() => SKEMA.find((s) => s.id === skemaId), [skemaId]);
  const sumber = SUMBER[skema.sumber];

  const gantiSkema = (id) => {
    setSkemaId(id);
    setItems(buildDefaultItems(id));
  };

  const subtotal = useMemo(() => {
    const out = {};
    for (const cat of CATEGORIES) out[cat.id] = items[cat.id].reduce((a, it) => a + jumlahItem(it), 0);
    return out;
  }, [items]);

  const total = useMemo(() => Object.values(subtotal).reduce((a, b) => a + b, 0), [subtotal]);

  const habisPakai = useMemo(
    () => CATEGORIES.filter((c) => c.habisPakai).reduce((a, c) => a + subtotal[c.id], 0),
    [subtotal]
  );
  const tidakHabisPakai = total - habisPakai;

  const updateItem = (catId, rowId, field, value) => {
    // Cegah nilai negatif pada Vol/Vol2/Harga langsung saat mengetik — atribut HTML
    // min="0" tidak benar-benar memblokir input "-", hanya menandai :invalid.
    if ((field === "vol" || field === "vol2" || field === "harga") && value !== "" && Number(value) < 0) {
      return;
    }
    setItems((prev) => ({
      ...prev,
      [catId]: prev[catId].map((it) => (it.id === rowId ? { ...it, [field]: value } : it)),
    }));
  };

  const addRow = (catId) => setItems((prev) => ({ ...prev, [catId]: [...prev[catId], emptyRow()] }));
  const removeRow = (catId, rowId) =>
    setItems((prev) => ({ ...prev, [catId]: prev[catId].filter((it) => it.id !== rowId) }));
  const duplicateRow = (catId, rowId) =>
    setItems((prev) => {
      const arr = prev[catId];
      const idx = arr.findIndex((it) => it.id === rowId);
      if (idx === -1) return prev;
      const salinan = { ...arr[idx], id: nextRowId() };
      const next = [...arr.slice(0, idx + 1), salinan, ...arr.slice(idx + 1)];
      return { ...prev, [catId]: next };
    });

  const muatTemplate = () => {
    if (!window.confirm("Muat ulang template default skema ini? Item yang sudah diubah akan tertimpa.")) return;
    setItems(buildDefaultItems(skemaId));
  };
  const kosongkanSemua = () => {
    if (!window.confirm("Kosongkan seluruh item RAB? Tindakan ini tidak bisa dibatalkan.")) return;
    const out = {};
    for (const cat of CATEGORIES) out[cat.id] = [emptyRow()];
    setItems(out);
  };

  const skalakan = () => {
    const target = Number(targetDana);
    if (!target || total <= 0) return;
    const factor = target / total;
    setItems((prev) => {
      const out = {};
      for (const cat of CATEGORIES) {
        out[cat.id] = prev[cat.id].map((it) => ({ ...it, harga: Math.round((Number(it.harga) || 0) * factor) }));
      }
      return out;
    });
  };

  const exportCSV = () => {
    const rows = [["Komponen", "No", "Uraian", "Vol", "Sat", "Vol2", "Sat2", "Harga Satuan (Rp)", "Jumlah (Rp)"]];
    CATEGORIES.forEach((cat) => {
      items[cat.id].forEach((it, idx) => {
        rows.push([cat.title, idx + 1, it.label, it.vol, it.sat, it.vol2, it.sat2, it.harga, Math.round(jumlahItem(it))]);
      });
      rows.push([cat.title, "", `Subtotal ${cat.title}`, "", "", "", "", "", Math.round(subtotal[cat.id])]);
    });
    rows.push(["", "", "TOTAL RENCANA ANGGARAN BIAYA", "", "", "", "", "", Math.round(total)]);
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RAB_${skema.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportXLS = () => {
    const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let body = `<tr><th colspan="9" style="font-size:16px;text-align:left;">RENCANA ANGGARAN BIAYA - ${esc(skema.nama)}</th></tr>`;
    body += `<tr><td colspan="9">Program Studi: ${esc(progStudi || "-")} &nbsp;|&nbsp; Ketua Peneliti: ${esc(namaKetua || "-")}</td></tr>`;
    body += `<tr></tr>`;
    body += `<tr><th>Komponen</th><th>No</th><th>Uraian</th><th>Vol</th><th>Sat</th><th>Vol2</th><th>Sat2</th><th>Harga Satuan (Rp)</th><th>Jumlah (Rp)</th></tr>`;
    CATEGORIES.forEach((cat) => {
      items[cat.id].forEach((it, idx) => {
        body += `<tr><td>${esc(cat.title)}</td><td>${idx + 1}</td><td>${esc(it.label)}</td><td>${esc(it.vol)}</td><td>${esc(it.sat)}</td><td>${esc(it.vol2)}</td><td>${esc(it.sat2)}</td><td>${it.harga}</td><td>${Math.round(jumlahItem(it))}</td></tr>`;
      });
      body += `<tr><td colspan="8"><b>Subtotal ${esc(cat.title)}</b></td><td><b>${Math.round(subtotal[cat.id])}</b></td></tr>`;
    });
    body += `<tr><td colspan="8"><b>TOTAL RENCANA ANGGARAN BIAYA</b></td><td><b>${Math.round(total)}</b></td></tr>`;
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>RAB</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><style>table{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;}td,th{border:1px solid #999;padding:4px 8px;}th{background:#EDE7DE;}</style></head><body><table>${body}</table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RAB_${skema.id}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      if (text.slice(0, 2) === "PK") {
        window.alert(
          "File .xlsx biner asli belum didukung untuk impor langsung. " +
          "Gunakan tombol \"Unduh Excel (.xls)\" dari sistem ini agar filenya bisa diimpor kembali, atau gunakan Impor CSV."
        );
        return;
      }
      let rows;
      try {
        rows = /^\s*<(!doctype|html)/i.test(text) ? parseHTMLTableText(text) : parseCSVText(text);
      } catch {
        rows = [];
      }
      const next = importItemsFromRows(rows);
      if (!next) {
        window.alert("Format file tidak dikenali. Gunakan file hasil \"Unduh CSV\" atau \"Unduh Excel (.xls)\" dari sistem ini.");
        return;
      }
      if (!window.confirm("Impor file ini akan menggantikan seluruh item RAB saat ini. Lanjutkan?")) return;
      setItems(next);
    };
    reader.onerror = () => window.alert("Gagal membaca file.");
    reader.readAsText(file, "utf-8");
  };
  // ---- Validasi realistis ----
  const validasi = useMemo(() => {
    const issues = [];
    const b = skema.batas;
    if (total <= 0) return issues;

    if (total < skema.paguMin - 1e-6) {
      issues.push({
        level: "warn",
        msg: `Total RAB ${rupiah(total)} masih di bawah pagu minimum skema (${rupiah(skema.paguMin)}).`,
      });
    }
    if (total > skema.paguMax + 1e-6) {
      issues.push({
        level: "error",
        msg: `Total RAB ${rupiah(total)} melebihi pagu maksimum skema (${rupiah(skema.paguMax)}). Kurangi ${rupiah(total - skema.paguMax)}.`,
      });
    }

    const honorFrac = subtotal.honor / total;
    if (b.honor && honorFrac > b.honor + 1e-6) {
      issues.push({
        level: "error",
        msg: `Honorarium ${pct(honorFrac)} melebihi batas ${pct(b.honor)} untuk ${skema.nama.split("(")[0].trim()}. Maks ${rupiah(b.honor * total)}.`,
      });
    }

    const peralFrac = subtotal.peralatan / total;
    if (b.peralatan && peralFrac > b.peralatan + 1e-6) {
      issues.push({
        level: "error",
        msg: `Peralatan (tidak habis pakai) ${pct(peralFrac)} melebihi batas wajar ${pct(b.peralatan)}. Hibah menekankan belanja habis pakai, bukan pengadaan aset.`,
      });
    }

    const perjalFrac = subtotal.perjalanan / total;
    if (b.perjalanan && perjalFrac > b.perjalanan + 1e-6) {
      issues.push({
        level: "warn",
        msg: `Perjalanan ${pct(perjalFrac)} di atas ambang ${pct(b.perjalanan)} — reviewer sering menandai perjalanan dominan sebagai tidak efisien.`,
      });
    }

    const hpFrac = habisPakai / total;
    if (hpFrac < skema.minHabisPakai - 1e-6) {
      issues.push({
        level: "warn",
        msg: `Dana habis pakai hanya ${pct(hpFrac)}. Skema ini idealnya ≥ ${pct(skema.minHabisPakai)} habis pakai agar dana berdampak langsung pada riset.`,
      });
    }

    if (subtotal.bahan / total < 0.05 && skema.sumber === "diktisaintek") {
      issues.push({
        level: "warn",
        msg: `Belanja bahan < 5% — untuk penelitian empiris ini tidak lazim dan mudah dicurigai reviewer.`,
      });
    }
    if (subtotal.lain / total < 0.03) {
      issues.push({
        level: "warn",
        msg: `Publikasi & pelaporan < 3% — luaran wajib (artikel/laporan) butuh anggaran nyata (biaya submit/APC, penggandaan).`,
      });
    }

    for (const cat of CATEGORIES) {
      if (items[cat.id].some((it) => it.label.trim() && (!it.harga || Number(it.harga) <= 0))) {
        issues.push({
          level: "warn",
          msg: `Ada item pada "${cat.title.replace(/^\d+\.\s*/, "")}" tanpa harga satuan — lengkapi agar RAB akurat.`,
        });
      }
    }

    return issues;
  }, [subtotal, total, habisPakai, skema, items]);

  const skorRealistis = useMemo(() => {
    let skor = 100;
    for (const i of validasi) skor -= i.level === "error" ? 25 : 8;
    return Math.max(0, skor);
  }, [validasi]);

  const bar = (frac, color) => (
    <div style={{ background: "#EDE7DE", height: 8, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, frac * 100))}%`, height: "100%", background: color, transition: "width .3s" }} />
    </div>
  );

  const skorColor = skorRealistis >= 80 ? "#1B5E4F" : skorRealistis >= 55 ? "#B5820A" : "#A23B23";

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: "#FBF8F2", minHeight: "100vh", color: "#2A241C", padding: "0 0 60px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input[type=range]{ -webkit-appearance:none; appearance:none; height:5px; border-radius:99px; background:#E4DCCF; outline:none; }
        input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:${sumber.warna}; cursor:pointer; border:3px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.2); }
        input[type=range]::-moz-range-thumb{ width:18px; height:18px; border-radius:50%; background:${sumber.warna}; cursor:pointer; border:3px solid #fff; }
        .num-input{ font-variant-numeric: tabular-nums; }
        button:focus-visible, input:focus-visible, select:focus-visible, label:focus-visible {
          outline: 2px solid #1B5E4F; outline-offset: 2px;
        }
        table{ border-collapse:collapse; width:100%; }
        .grid-2col{ display:grid; grid-template-columns:1.4fr 1fr; gap:24px; }
        .grid-3col{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; }
        @media (max-width: 720px) {
          .grid-2col, .grid-3col{ grid-template-columns:1fr; }
          h1{ font-size:30px !important; }
        }
        .print-only{ display:none; }
        @media print {
          .print-only{ display:block !important; }
          .no-print{ display:none !important; }
          body{ background:#fff; }
          main{ margin-top:0 !important; max-width:100% !important; }
          header{ background:#fff !important; color:#2A241C !important; padding:0 0 16px !important; }
          section{ box-shadow:none !important; border:none !important; padding:0 !important; break-inside:avoid; }
          .rab-category{ page-break-inside:avoid; }
          input, select{ border:none !important; background:transparent !important; box-shadow:none !important; padding:2px 0 !important; color:#2A241C !important; -webkit-appearance:none; appearance:none; }
          input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button{ -webkit-appearance:none; margin:0; }
          table{ font-size:11px; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        background: `linear-gradient(120deg, ${sumber.warna} 0%, ${sumber.warna}dd 100%)`,
        color: "#FBF8F2", padding: "36px 28px 44px",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, letterSpacing: 3, textTransform: "uppercase", opacity: .8 }}>
            Sistem Penyusun RAB · Prodi Teknik Informatika ITB Asia
          </div>
          <h1 style={{
            fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 40, margin: "8px 0 6px", lineHeight: 1.05,
          }}>
            Sistem RAB Hibah
          </h1>
          <p style={{ margin: 0, maxWidth: 680, opacity: .92, fontSize: 15, lineHeight: 1.5 }}>
            Susun Rencana Anggaran Biaya proposal hibah per komponen & item (mengikuti format resmi:
            Vol · Sat · Vol2 · Sat2 · Harga Satuan), lengkap dengan validasi batas komponen dan
            pemisahan dana habis pakai vs tidak habis pakai — agar anggaran lolos telaah reviewer.
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "-24px auto 0", padding: "0 20px", display: "grid", gap: 20 }}>

        {/* Pemilihan skema + identitas proposal */}
        <section style={card}>
          <div className="grid-2col">
            <div>
              <label style={lbl} htmlFor="input-skema">Skema Hibah</label>
              <select id="input-skema" value={skemaId} onChange={(e) => gantiSkema(e.target.value)} style={select}>
                <optgroup label="Kemdiktisaintek (DPPM)">
                  {SKEMA.filter((s) => s.sumber === "diktisaintek").map((s) => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </optgroup>
                <optgroup label="BRIN">
                  {SKEMA.filter((s) => s.sumber === "brin").map((s) => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </optgroup>
                <optgroup label="Umum">
                  {SKEMA.filter((s) => s.sumber === "umum").map((s) => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </optgroup>
              </select>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <span style={chip(sumber.warna)}>{sumber.nama}</span>
                <span style={chip("#8A7A5C")}>{skema.tkt}</span>
                <span style={chip("#8A7A5C")}>Durasi {skema.durasi}</span>
              </div>
              <p style={{ fontSize: 13, color: "#6B6252", lineHeight: 1.5, marginTop: 12, marginBottom: 0 }}>
                {skema.catatan}
              </p>
            </div>

            <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
              <div>
                <label style={lbl} htmlFor="input-prodi">Program Studi</label>
                <input id="input-prodi" style={{ ...inputText, width: "100%" }} value={progStudi} onChange={(e) => setProgStudi(e.target.value)} />
              </div>
              <div>
                <label style={lbl} htmlFor="input-ketua">Nama Ketua Peneliti</label>
                <input id="input-ketua" style={{ ...inputText, width: "100%" }} value={namaKetua} onChange={(e) => setNamaKetua(e.target.value)}
                  placeholder="................................" />
              </div>
            </div>
          </div>
        </section>

        {/* Skor + ringkasan habis pakai */}
        <section className="grid-3col">
          <div style={{ ...card, textAlign: "center" }}>
            <div style={metricLbl}>Skor Realistis</div>
            <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 44, color: skorColor, lineHeight: 1 }}>
              {skorRealistis}
            </div>
            <div style={{ fontSize: 12, color: "#8A7A5C" }}>
              {skorRealistis >= 80 ? "Anggaran sehat" : skorRealistis >= 55 ? "Perlu perbaikan" : "Rawan ditolak reviewer"}
            </div>
          </div>
          <div style={card}>
            <div style={metricLbl}>Dana Habis Pakai</div>
            <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, color: "#1B5E4F" }}>
              {rupiah(habisPakai)}
            </div>
            <div style={{ fontSize: 12, color: "#8A7A5C", marginBottom: 8 }}>{pct(total > 0 ? habisPakai / total : 0)} dari total</div>
            {bar(total > 0 ? habisPakai / total : 0, "#1B5E4F")}
          </div>
          <div style={card}>
            <div style={metricLbl}>Tidak Habis Pakai (aset)</div>
            <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, color: "#7A3E1D" }}>
              {rupiah(tidakHabisPakai)}
            </div>
            <div style={{ fontSize: 12, color: "#8A7A5C", marginBottom: 8 }}>{pct(total > 0 ? tidakHabisPakai / total : 0)} dari total</div>
            {bar(total > 0 ? tidakHabisPakai / total : 0, "#7A3E1D")}
          </div>
        </section>

        {/* Toolbar */}
        <section style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }} className="no-print">
          <button onClick={muatTemplate} style={btnGhost}>Muat Template Default</button>
          <button onClick={kosongkanSemua} style={btnGhost}>Kosongkan Semua</button>
          <span style={{ fontSize: 12, color: "#8A7A5C", opacity: tersimpan ? 1 : 0, transition: "opacity .3s" }}>
            ✓ Draft tersimpan otomatis
          </span>
          <div style={{ flex: 1 }} />
          <input
            className="num-input" type="number" placeholder="Target total (Rp)" aria-label="Target total anggaran (Rp)"
            value={targetDana} onChange={(e) => setTargetDana(e.target.value)}
            style={{ ...numBox, width: 160, textAlign: "left" }}
          />
          <button onClick={skalakan} style={btnGhost}>Skalakan Harga ke Target</button>
          <label htmlFor="import-csv-input" style={{ ...btnGhost, display: "inline-block" }}>Impor CSV/Excel</label>
          <input id="import-csv-input" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel" onChange={handleImportFile} style={{ display: "none" }} />
          <button onClick={exportCSV} style={btnGhost}>Unduh CSV</button>
          <button onClick={exportXLS} style={btnGhost}>Unduh Excel (.xls)</button>
          <button onClick={() => window.print()} style={{ ...btnGhost, background: sumber.warna, color: "#fff", borderColor: sumber.warna }}>Cetak / Simpan PDF</button>
        </section>

        {/* Rincian Item RAB per komponen */}
        <section style={card}>
          <h2 style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, margin: "0 0 16px" }}>Rincian Item RAB</h2>
          {CATEGORIES.map((cat) => (
            <CategoryBlock
              key={cat.id}
              cat={cat}
              rows={items[cat.id]}
              subtotalVal={subtotal[cat.id]}
              total={total}
              onUpdate={(rowId, field, value) => updateItem(cat.id, rowId, field, value)}
              onAdd={() => addRow(cat.id)}
              onRemove={(rowId) => removeRow(cat.id, rowId)}
              onDuplicate={(rowId) => duplicateRow(cat.id, rowId)}
            />
          ))}

          {/* Total */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 16, marginTop: 4, borderTop: "2px solid #E4DCCF",
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>TOTAL RENCANA ANGGARAN BIAYA</div>
              <div style={{ fontSize: 12, color: total > skema.paguMax ? "#A23B23" : total < skema.paguMin ? "#B5820A" : "#1B5E4F", fontWeight: 600, marginTop: 2 }}>
                Pagu skema {rupiah(skema.paguMin)} – {rupiah(skema.paguMax)}
                {total > skema.paguMax ? " · melebihi pagu maksimum" : total < skema.paguMin ? " · di bawah pagu minimum" : " · dalam pagu"}
              </div>
            </div>
            <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 26, color: sumber.warna }}>
              {rupiah(total)}
            </div>
          </div>
        </section>

        {/* Panel validasi */}
        <section style={card}>
          <h2 style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, margin: "0 0 4px" }}>
            Telaah Anggaran
          </h2>
          <p style={{ fontSize: 13, color: "#6B6252", marginTop: 0 }}>
            Pemeriksaan otomatis terhadap batas komponen skema {skema.nama.split("(")[0].trim()} dan kewajaran alokasi.
          </p>
          {validasi.length === 0 ? (
            <div style={{
              background: "#E3F0EA", color: "#1B5E4F", padding: "14px 16px", borderRadius: 10,
              fontWeight: 600, fontSize: 14, display: "flex", gap: 10, alignItems: "center",
            }}>
              ✓ Semua komponen dalam batas wajar. Anggaran siap ditelaah reviewer.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {validasi.map((i, idx) => (
                <div key={idx} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  background: i.level === "error" ? "#FBEAE4" : "#FBF3DE",
                  border: `1px solid ${i.level === "error" ? "#E7BBAC" : "#E8D5A0"}`,
                  padding: "12px 14px", borderRadius: 10,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, marginTop: 1,
                    background: i.level === "error" ? "#A23B23" : "#B5820A", color: "#fff", flexShrink: 0,
                  }}>
                    {i.level === "error" ? "WAJIB" : "SARAN"}
                  </span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "#3A322A" }}>{i.msg}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p style={{ fontSize: 11.5, color: "#9A9080", textAlign: "center", lineHeight: 1.6, margin: "4px 20px" }}>
          Struktur komponen, uraian, satuan & harga satuan acuan diadaptasi dari berkas RAB_Hibah_Semua_Skema
          berdasarkan panduan DPPM Kemdiktisaintek TA 2026, kebijakan honorarium peneliti maks 25%
          (SBM Kemenkeu 2026), skema BESTARI, RIKUB, dan program BRIN. Semua nilai bersifat acuan
          perencanaan — selalu verifikasi angka final ke panduan resmi & surat edaran terbaru sebelum submit ke BIMA.
        </p>
        <p className="print-only" style={{ fontSize: 11, color: "#9A9080", textAlign: "right", margin: "0 20px" }}>
          Dicetak pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </main>
    </div>
  );
}

function CategoryBlock({ cat, rows, subtotalVal, total, onUpdate, onAdd, onRemove, onDuplicate }) {
  const frac = total > 0 ? subtotalVal / total : 0;
  return (
    <div className="rab-category" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 16, margin: 0 }}>{cat.title}</h3>
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
            background: cat.habisPakai ? "#E3F0EA" : "#F3E3D8",
            color: cat.habisPakai ? "#1B5E4F" : "#7A3E1D",
          }}>
            {cat.habisPakai ? "HABIS PAKAI" : "ASET"}
          </span>
        </div>
        <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 15 }}>
          {rupiah(subtotalVal)} <span style={{ fontSize: 12, fontWeight: 600, color: "#8A7A5C" }}>({pct(frac)})</span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: 32 }}>No</th>
              <th style={{ ...th, textAlign: "left" }}>Uraian</th>
              <th style={{ ...th, width: 56 }}>Vol</th>
              <th style={{ ...th, width: 64 }}>Sat</th>
              <th style={{ ...th, width: 56 }}>Vol2</th>
              <th style={{ ...th, width: 64 }}>Sat2</th>
              <th style={{ ...th, width: 130 }}>Harga Satuan (Rp)</th>
              <th style={{ ...th, width: 130 }}>Jumlah (Rp)</th>
              <th style={{ ...th, width: 32 }} className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it, idx) => (
              <tr key={it.id}>
                <td style={td}>{idx + 1}</td>
                <td style={{ ...td, textAlign: "left" }}>
                  <input style={inputCell} value={it.label} aria-label={`Uraian item ${cat.title}`}
                    onChange={(e) => onUpdate(it.id, "label", e.target.value)} placeholder="Uraian item..." />
                </td>
                <td style={td}>
                  <input style={{ ...inputCell, textAlign: "center" }} type="number" min="0" value={it.vol} aria-label="Vol"
                    onChange={(e) => onUpdate(it.id, "vol", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={{ ...inputCell, textAlign: "center" }} value={it.sat} aria-label="Satuan"
                    onChange={(e) => onUpdate(it.id, "sat", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={{ ...inputCell, textAlign: "center" }} type="number" min="0" value={it.vol2} aria-label="Vol2"
                    onChange={(e) => onUpdate(it.id, "vol2", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={{ ...inputCell, textAlign: "center" }} value={it.sat2} aria-label="Satuan2"
                    onChange={(e) => onUpdate(it.id, "sat2", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={{ ...inputCell, textAlign: "right" }} type="number" min="0" value={it.harga} aria-label="Harga satuan"
                    onChange={(e) => onUpdate(it.id, "harga", e.target.value)} />
                  {Number(it.harga) > 0 && (
                    <div className="no-print" style={{ fontSize: 10.5, color: "#8A7A5C", textAlign: "right", marginTop: 1 }}>
                      {rupiah(Number(it.harga))}
                    </div>
                  )}
                </td>
                <td style={{ ...td, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {rupiah(jumlahItem(it))}
                </td>
                <td style={td} className="no-print">
                  <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                    <button onClick={() => onDuplicate(it.id)} title="Duplikat item" aria-label={`Duplikat item ${it.label || idx + 1}`} style={btnDuplicate}>⧉</button>
                    <button onClick={() => onRemove(it.id)} title="Hapus item" aria-label={`Hapus item ${it.label || idx + 1}`} style={btnRemove}>×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onAdd} style={{ ...btnGhost, marginTop: 8 }} className="no-print" aria-label={`Tambah item ke ${cat.title}`}>+ Tambah Item</button>
    </div>
  );
}

// ---- styles ----
const card = {
  background: "#fff", borderRadius: 16, padding: "22px 24px",
  boxShadow: "0 1px 3px rgba(60,50,30,.06), 0 8px 24px rgba(60,50,30,.04)",
  border: "1px solid #F0EADF",
};
const lbl = { display: "block", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#8A7A5C", marginBottom: 8 };
const metricLbl = { fontSize: 11.5, fontWeight: 700, letterSpacing: .8, textTransform: "uppercase", color: "#8A7A5C", marginBottom: 6 };
const select = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #E4DCCF",
  fontSize: 14.5, fontFamily: "inherit", fontWeight: 600, background: "#FBF8F2", color: "#2A241C", cursor: "pointer",
};
const numBox = {
  width: 72, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #E4DCCF",
  fontSize: 14, fontFamily: "inherit", textAlign: "right", background: "#FBF8F2", color: "#2A241C",
};
const inputText = {
  padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E4DCCF",
  fontSize: 14, fontFamily: "inherit", background: "#FBF8F2", color: "#2A241C",
};
const chip = (c) => ({
  fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 7,
  background: c + "18", color: c, border: `1px solid ${c}33`,
});
const btnGhost = {
  border: "1.5px solid #E4DCCF", background: "#fff", padding: "7px 13px", borderRadius: 8,
  fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", color: "#6B6252",
};
const table = { borderCollapse: "collapse", width: "100%", minWidth: 720 };
const th = {
  fontSize: 11, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", color: "#8A7A5C",
  textAlign: "center", padding: "6px 6px", borderBottom: "2px solid #E4DCCF",
};
const td = {
  fontSize: 13, textAlign: "center", padding: "4px 6px", borderBottom: "1px solid #F0EADF",
};
const inputCell = {
  width: "100%", padding: "6px 8px", borderRadius: 6, border: "1.5px solid #E4DCCF",
  fontSize: 13, fontFamily: "inherit", background: "#FBF8F2", color: "#2A241C",
};
const btnRemove = {
  border: "none", background: "transparent", color: "#A23B23", fontSize: 16, fontWeight: 700,
  cursor: "pointer", lineHeight: 1, padding: "2px 6px",
};
const btnDuplicate = {
  border: "none", background: "transparent", color: "#8A7A5C", fontSize: 14, fontWeight: 700,
  cursor: "pointer", lineHeight: 1, padding: "2px 6px",
};
