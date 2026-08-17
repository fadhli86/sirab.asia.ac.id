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

// Ikon & warna aksen per komponen — dipakai untuk dashboard & tampilan rincian
const CATEGORY_META = {
  honor: { icon: "👥", color: "#1B5E4F" },
  bahan: { icon: "🧪", color: "#3D7A63" },
  data: { icon: "📊", color: "#2E6B8F" },
  perjalanan: { icon: "🚗", color: "#B5820A" },
  sewa: { icon: "🏢", color: "#8A6D3B" },
  peralatan: { icon: "🖥️", color: "#7A3E1D" },
  lain: { icon: "📄", color: "#6B4A8A" },
};

// Panduan singkat & contoh uraian detail per komponen — ditampilkan sebagai tips + saran
// autocomplete pada kolom Uraian, agar pengaju proposal mudah menulis uraian yang spesifik
// dan tidak mudah dipertanyakan reviewer (nama item, spesifikasi/cakupan, tujuan penggunaan).
const CATEGORY_TIPS = {
  honor: "Sebutkan peran (ketua/anggota/asisten), jumlah OB, dan acuan SBM.",
  bahan: "Sebutkan nama bahan/komponen, spesifikasi, dan kegunaannya dalam penelitian.",
  data: "Jelaskan metode pengumpulan data serta cakupan responden/sampel.",
  perjalanan: "Sebutkan tujuan, moda transportasi, dan jumlah orang/hari.",
  sewa: "Sebutkan nama alat/ruang yang disewa dan durasi pemakaian.",
  peralatan: "Jelaskan spesifikasi & fungsi alat agar porsinya wajar (aset, bukan habis pakai).",
  lain: "Sebutkan jenis luaran (artikel/HKI/laporan) dan target publikasinya.",
};
const CONTOH_URAIAN = {
  honor: [
    "Honorarium ketua peneliti (1 org x 8 OB, sesuai SBM Kemenkeu 2026)",
    "Honorarium anggota peneliti bidang statistik (2 org x 8 OB)",
    "Honorarium asisten lapangan pengumpulan data primer (2 org x 20 OH)",
  ],
  bahan: [
    "Reagen kimia analisis sampel air (spesifikasi & merk, 1 paket)",
    "Komponen elektronik prototipe sensor IoT (1 paket)",
    "Lisensi perangkat lunak analisis statistik (1 tahun)",
  ],
  data: [
    "Honor enumerator survei 150 responden di 3 kecamatan",
    "Transkripsi wawancara mendalam 20 informan",
    "Uji laboratorium sampel tanah (20 sampel, parameter unsur hara)",
  ],
  perjalanan: [
    "Transport survei lapangan tim peneliti (2 org x 5 OH, wilayah kerja)",
    "Perjalanan diseminasi/seminar hasil penelitian nasional (1 org x 3 hari)",
    "Transport koordinasi dengan mitra/lokasi penelitian (2 org x 2 OH)",
  ],
  sewa: [
    "Sewa instrumen GC-MS untuk analisis sampel (3 bulan)",
    "Sewa ruang laboratorium terpadu kampus mitra (1 semester)",
    "Sewa kendaraan operasional survei lapangan (10 hari)",
  ],
  peralatan: [
    "Laptop untuk pengolahan data & simulasi (1 unit, spesifikasi i7/16GB)",
    "Sensor akuisisi data lapangan (1 unit, spesifikasi terlampir)",
    "Printer & scanner dokumen penelitian (1 unit)",
  ],
  lain: [
    "Biaya publikasi artikel jurnal internasional bereputasi (APC, 1 artikel)",
    "Penggandaan & penjilidan laporan akhir penelitian (10 eksemplar)",
    "Pengurusan HKI luaran penelitian (1 paket)",
  ],
};

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

// Lookup label default per komponen (dari ITEM_TEMPLATE) — dipakai untuk mendeteksi
// uraian yang belum diubah pengaju dari teks bawaan template (masih generik).
const ITEM_TEMPLATE_LOOKUP = Object.fromEntries(
  Object.entries(ITEM_TEMPLATE).map(([catId, arr]) => [catId, arr.map((it) => it.label)])
);

// Uraian dianggap generik/kurang detail bila kosong, terlalu singkat (<10 karakter),
// atau masih persis sama dengan teks bawaan template (belum disesuaikan pengaju).
// Dipakai bersama oleh: rekomendasi AI, badge peringatan per baris, dan fitur
// "klik contoh untuk isi otomatis" — agar kriterianya selalu konsisten di satu tempat.
const isUraianGenerik = (catId, label) => {
  const trimmed = (label || "").trim();
  if (!trimmed) return true;
  if (trimmed.length < 10) return true;
  return (ITEM_TEMPLATE_LOOKUP[catId] || []).includes(trimmed);
};

// Harga satuan acuan (Rp) per skema, hasil kalibrasi template resmi agar
// proporsional terhadap pagu masing-masing skema. Urutan mengikuti ITEM_TEMPLATE.
// Setiap komponen (bahan/data/perjalanan/sewa/lain) dibobot berbeda per jenis item
// (mis. reagen > ATK, transport lokal > diseminasi) agar acuan harga tidak seragam/
// monoton antar baris — total per komponen tetap sama seperti kalibrasi awal.
const HARGA_ACUAN = {
  pfr: { honor: [1020000, 1020000, 3741000, 194475], bahan: [21000000, 6300000, 14700000], data: [9450000, 4200000, 7350000], perjalanan: [10800000, 7200000], sewa: [4950000, 4050000], peralatan: [12000000], lain: [6600000, 2400000, 3000000] },
  pktp: { honor: [1020000, 1020000, 3741000, 194475], bahan: [18000000, 5400000, 12600000], data: [9450000, 4200000, 7350000], perjalanan: [16200000, 10800000], sewa: [4950000, 4050000], peralatan: [9000000], lain: [6600000, 2400000, 3000000] },
  katalis: { honor: [3401000, 3401000, 12470000, 647650], bahan: [65000000, 19500000, 45500000], data: [31500000, 14000000, 24500000], perjalanan: [36000000, 24000000], sewa: [16500000, 13500000], peralatan: [50000000], lain: [22000000, 8000000, 10000000] },
  terapan: { honor: [1559000, 1559000, 5715000, 296725], bahan: [30000000, 9000000, 21000000], data: [13500000, 6000000, 10500000], perjalanan: [18000000, 12000000], sewa: [11000000, 9000000], peralatan: [35000000], lain: [11000000, 4000000, 5000000] },
  rikub: { honor: [4364000, 4364000, 16003000, 831525], bahan: [84000000, 25200000, 58800000], data: [37800000, 16800000, 29400000], perjalanan: [50400000, 33600000], sewa: [30800000, 25200000], peralatan: [98000000], lain: [30800000, 11200000, 14000000] },
  bestari: { honor: [5951000, 5951000, 21822000, 1133850], bahan: [82500000, 24750000, 57750000], data: [40500000, 18000000, 31500000], perjalanan: [54000000, 36000000], sewa: [24750000, 20250000], peralatan: [90000000], lain: [33000000, 12000000, 15000000] },
  brin_riim: { honor: [3117000, 3117000, 11430000, 594050], bahan: [55000000, 16500000, 38500000], data: [27000000, 12000000, 21000000], perjalanan: [30000000, 20000000], sewa: [22000000, 18000000], peralatan: [90000000], lain: [22000000, 8000000, 10000000] },
  brin_degree: { honor: [2891000, 2891000, 10599000, 550425], bahan: [30000000, 9000000, 21000000], data: [18900000, 8400000, 14700000], perjalanan: [18000000, 12000000], sewa: [9900000, 8100000], peralatan: [24000000], lain: [13200000, 4800000, 6000000] },
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
  // Model multi tahun — RAB disimpan per tahun pelaksanaan (itemsByTahun[i] = item satu tahun).
  // Draft lama (single-year) tetap kompatibel: dibungkus jadi array 1 tahun.
  const [jumlahTahun, setJumlahTahun] = useState(initialDraft?.jumlahTahun || 1);
  const [itemsByTahun, setItemsByTahun] = useState(() => {
    if (initialDraft?.itemsByTahun?.length) return initialDraft.itemsByTahun;
    if (initialDraft?.items) return [initialDraft.items];
    return [buildDefaultItems(initialDraft?.skemaId || "pfr")];
  });
  const [activeTahun, setActiveTahun] = useState(0);
  const [progStudi, setProgStudi] = useState(initialDraft?.progStudi ?? "Teknik Informatika – ITB Asia Malang");
  const [namaKetua, setNamaKetua] = useState(initialDraft?.namaKetua ?? "");
  const [targetDana, setTargetDana] = useState("");
  const [tersimpan, setTersimpan] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  // Pagu kustom — memungkinkan pengaju mengganti sendiri nilai pagu hibah
  // (mis. skema internal kampus / mitra dengan plafon berbeda dari acuan default).
  const [paguKustom, setPaguKustom] = useState(initialDraft?.paguKustom ?? false);
  const [paguMinKustom, setPaguMinKustom] = useState(
    initialDraft?.paguMinKustom ?? String((SKEMA.find((s) => s.id === (initialDraft?.skemaId || "pfr")) || SKEMA[0]).paguMin)
  );
  const [paguMaxKustom, setPaguMaxKustom] = useState(
    initialDraft?.paguMaxKustom ?? String((SKEMA.find((s) => s.id === (initialDraft?.skemaId || "pfr")) || SKEMA[0]).paguMax)
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ skemaId, itemsByTahun, jumlahTahun, progStudi, namaKetua, paguKustom, paguMinKustom, paguMaxKustom }));
      setTersimpan(true);
      const t = setTimeout(() => setTersimpan(false), 1500);
      return () => clearTimeout(t);
    } catch {
      /* localStorage tidak tersedia — abaikan */
    }
  }, [skemaId, itemsByTahun, jumlahTahun, progStudi, namaKetua, paguKustom, paguMinKustom, paguMaxKustom]);

  const skema = useMemo(() => SKEMA.find((s) => s.id === skemaId), [skemaId]);
  const sumber = SUMBER[skema.sumber];

  // Item tahun yang sedang dilihat/diedit di tab Rincian Item, plus setter yang menyasar
  // tahun tersebut saja — dipakai apa adanya oleh semua fungsi lama (updateItem, dst).
  const items = itemsByTahun[activeTahun] || itemsByTahun[0];
  const setItemsForYear = (yearIdx, updater) => {
    setItemsByTahun((prev) => {
      const next = [...prev];
      next[yearIdx] = typeof updater === "function" ? updater(next[yearIdx]) : updater;
      return next;
    });
  };
  const setItems = (updater) => setItemsForYear(activeTahun, updater);

  // Pagu efektif yang benar-benar dipakai di seluruh validasi/rekomendasi/cetak:
  // pagu bawaan skema, atau nilai kustom bila pengaju mengaktifkannya. Berlaku per tahun.
  const pagu = useMemo(() => {
    if (!paguKustom) return { min: skema.paguMin, max: skema.paguMax };
    const min = Number(paguMinKustom);
    const max = Number(paguMaxKustom);
    return {
      min: Number.isFinite(min) && min >= 0 ? min : skema.paguMin,
      max: Number.isFinite(max) && max > 0 ? max : skema.paguMax,
    };
  }, [paguKustom, paguMinKustom, paguMaxKustom, skema]);

  const gantiSkema = (id) => {
    setSkemaId(id);
    setItemsByTahun(Array.from({ length: jumlahTahun }, () => buildDefaultItems(id)));
    setActiveTahun(0);
    const s = SKEMA.find((x) => x.id === id);
    setPaguMinKustom(String(s.paguMin));
    setPaguMaxKustom(String(s.paguMax));
  };

  // Mengubah jumlah tahun pelaksanaan: menambah tahun baru dari template default,
  // atau memangkas tahun terakhir (dengan konfirmasi karena datanya akan hilang).
  const ubahJumlahTahun = (n) => {
    const target = Math.max(1, Math.min(5, Number(n) || 1));
    if (target === jumlahTahun) return;
    if (target < jumlahTahun) {
      const hilang = jumlahTahun - target;
      if (!window.confirm(`Mengurangi durasi menjadi ${target} tahun akan menghapus data RAB ${hilang} tahun terakhir. Lanjutkan?`)) return;
      setItemsByTahun((prev) => prev.slice(0, target));
      setActiveTahun((a) => Math.min(a, target - 1));
    } else {
      setItemsByTahun((prev) => [...prev, ...Array.from({ length: target - jumlahTahun }, () => buildDefaultItems(skemaId))]);
    }
    setJumlahTahun(target);
  };

  const subtotalPerTahun = useMemo(
    () => itemsByTahun.map((yearItems) => {
      const out = {};
      for (const cat of CATEGORIES) out[cat.id] = yearItems[cat.id].reduce((a, it) => a + jumlahItem(it), 0);
      return out;
    }),
    [itemsByTahun]
  );
  const totalPerTahun = useMemo(
    () => subtotalPerTahun.map((s) => Object.values(s).reduce((a, b) => a + b, 0)),
    [subtotalPerTahun]
  );
  const totalKeseluruhan = useMemo(() => totalPerTahun.reduce((a, b) => a + b, 0), [totalPerTahun]);
  const habisPakaiPerTahun = useMemo(
    () => subtotalPerTahun.map((s) => CATEGORIES.filter((c) => c.habisPakai).reduce((a, c) => a + s[c.id], 0)),
    [subtotalPerTahun]
  );

  const subtotal = subtotalPerTahun[activeTahun] || subtotalPerTahun[0];
  const total = totalPerTahun[activeTahun] || 0;

  const habisPakai = habisPakaiPerTahun[activeTahun] || 0;
  const tidakHabisPakai = total - habisPakai;

  // Komponen diurutkan dari alokasi terbesar — untuk dashboard
  const sortedCats = useMemo(
    () => [...CATEGORIES].sort((a, b) => subtotal[b.id] - subtotal[a.id]),
    [subtotal]
  );

  // Gradasi conic untuk donat komposisi anggaran (tanpa library chart)
  const donutGradient = useMemo(() => {
    if (total <= 0) return "conic-gradient(#EDE7DE 0deg 360deg)";
    let acc = 0;
    const parts = CATEGORIES.map((cat) => {
      const start = acc;
      const frac = subtotal[cat.id] / total;
      acc += frac * 360;
      return `${CATEGORY_META[cat.id].color} ${start}deg ${acc}deg`;
    });
    return `conic-gradient(${parts.join(", ")})`;
  }, [subtotal, total]);

  // yearIdx opsional (default tahun aktif) — memungkinkan blok cetak menampilkan &
  // mengedit item tahun lain tanpa harus berpindah tab terlebih dahulu.
  const updateItem = (catId, rowId, field, value, yearIdx = activeTahun) => {
    // Cegah nilai negatif pada Vol/Vol2/Harga langsung saat mengetik — atribut HTML
    // min="0" tidak benar-benar memblokir input "-", hanya menandai :invalid.
    if ((field === "vol" || field === "vol2" || field === "harga") && value !== "" && Number(value) < 0) {
      return;
    }
    setItemsForYear(yearIdx, (prev) => ({
      ...prev,
      [catId]: prev[catId].map((it) => (it.id === rowId ? { ...it, [field]: value } : it)),
    }));
  };

  const addRow = (catId, yearIdx = activeTahun) => setItemsForYear(yearIdx, (prev) => ({ ...prev, [catId]: [...prev[catId], emptyRow()] }));
  const removeRow = (catId, rowId, yearIdx = activeTahun) =>
    setItemsForYear(yearIdx, (prev) => ({ ...prev, [catId]: prev[catId].filter((it) => it.id !== rowId) }));
  const duplicateRow = (catId, rowId, yearIdx = activeTahun) =>
    setItemsForYear(yearIdx, (prev) => {
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

  // Mengisi otomatis salah satu baris uraian dengan contoh yang diklik pengaju:
  // menyasar baris pertama yang uraiannya masih generik (kosong/singkat/bawaan template);
  // bila semua baris sudah spesifik, contoh ditambahkan sebagai baris baru.
  const useContoh = (catId, text, yearIdx = activeTahun) => {
    setItemsForYear(yearIdx, (prev) => {
      const arr = prev[catId];
      const idx = arr.findIndex((it) => isUraianGenerik(catId, it.label));
      if (idx === -1) return { ...prev, [catId]: [...arr, { ...emptyRow(), label: text }] };
      return { ...prev, [catId]: arr.map((it, i) => (i === idx ? { ...it, label: text } : it)) };
    });
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
    const rows = [["Tahun", "Komponen", "No", "Uraian", "Vol", "Sat", "Vol2", "Sat2", "Harga Satuan (Rp)", "Jumlah (Rp)"]];
    itemsByTahun.forEach((yearItems, yi) => {
      const labelTahun = `Tahun ke-${yi + 1}`;
      CATEGORIES.forEach((cat) => {
        yearItems[cat.id].forEach((it, idx) => {
          rows.push([labelTahun, cat.title, idx + 1, it.label, it.vol, it.sat, it.vol2, it.sat2, it.harga, Math.round(jumlahItem(it))]);
        });
        rows.push([labelTahun, cat.title, "", `Subtotal ${cat.title}`, "", "", "", "", "", Math.round(subtotalPerTahun[yi][cat.id])]);
      });
      rows.push([labelTahun, "", "", `TOTAL RAB ${labelTahun.toUpperCase()}`, "", "", "", "", "", Math.round(totalPerTahun[yi])]);
    });
    if (jumlahTahun > 1) {
      rows.push(["", "", "", "TOTAL KESELURUHAN (SEMUA TAHUN)", "", "", "", "", "", Math.round(totalKeseluruhan)]);
    }
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
    let body = `<tr><th colspan="10" style="font-size:16px;text-align:left;">RENCANA ANGGARAN BIAYA - ${esc(skema.nama)}</th></tr>`;
    body += `<tr><td colspan="10">Program Studi: ${esc(progStudi || "-")} &nbsp;|&nbsp; Ketua Peneliti: ${esc(namaKetua || "-")} &nbsp;|&nbsp; Durasi: ${jumlahTahun} tahun</td></tr>`;
    body += `<tr></tr>`;
    body += `<tr><th>Tahun</th><th>Komponen</th><th>No</th><th>Uraian</th><th>Vol</th><th>Sat</th><th>Vol2</th><th>Sat2</th><th>Harga Satuan (Rp)</th><th>Jumlah (Rp)</th></tr>`;
    itemsByTahun.forEach((yearItems, yi) => {
      const labelTahun = `Tahun ke-${yi + 1}`;
      CATEGORIES.forEach((cat) => {
        yearItems[cat.id].forEach((it, idx) => {
          body += `<tr><td>${esc(labelTahun)}</td><td>${esc(cat.title)}</td><td>${idx + 1}</td><td>${esc(it.label)}</td><td>${esc(it.vol)}</td><td>${esc(it.sat)}</td><td>${esc(it.vol2)}</td><td>${esc(it.sat2)}</td><td>${it.harga}</td><td>${Math.round(jumlahItem(it))}</td></tr>`;
        });
        body += `<tr><td colspan="9"><b>Subtotal ${esc(cat.title)}</b></td><td><b>${Math.round(subtotalPerTahun[yi][cat.id])}</b></td></tr>`;
      });
      body += `<tr><td colspan="9"><b>TOTAL RAB ${esc(labelTahun.toUpperCase())}</b></td><td><b>${Math.round(totalPerTahun[yi])}</b></td></tr>`;
    });
    if (jumlahTahun > 1) {
      body += `<tr><td colspan="9"><b>TOTAL KESELURUHAN (SEMUA TAHUN)</b></td><td><b>${Math.round(totalKeseluruhan)}</b></td></tr>`;
    }
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

    if (total < pagu.min - 1e-6) {
      issues.push({
        level: "warn",
        msg: `Total RAB ${rupiah(total)} masih di bawah pagu minimum ${paguKustom ? "kustom" : "skema"} (${rupiah(pagu.min)}).`,
      });
    }
    if (total > pagu.max + 1e-6) {
      issues.push({
        level: "error",
        msg: `Total RAB ${rupiah(total)} melebihi pagu maksimum ${paguKustom ? "kustom" : "skema"} (${rupiah(pagu.max)}). Kurangi ${rupiah(total - pagu.max)}.`,
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
  }, [subtotal, total, habisPakai, skema, items, pagu, paguKustom]);

  const skorRealistis = useMemo(() => {
    let skor = 100;
    for (const i of validasi) skor -= i.level === "error" ? 25 : 8;
    return Math.max(0, skor);
  }, [validasi]);

  // ---- Rekomendasi AI: analisis otomatis & saran penyesuaian rupiah yang spesifik ----
  // Menghitung selisih rupiah pasti yang perlu digeser/ditambah/dikurangi antar komponen
  // agar sesuai batas & ambang skema yang dipilih, alih-alih sekadar peringatan generik.
  const rekomendasi = useMemo(() => {
    const recs = [];
    if (total <= 0) return recs;
    const b = skema.batas;
    const NAMA = (id) => (CATEGORIES.find((c) => c.id === id)?.title || id).replace(/^\d+\.\s*/, "");

    if (total > pagu.max + 1e-6) {
      const excess = total - pagu.max;
      let sisa = excess;
      for (const catId of ["peralatan", "perjalanan", "sewa"]) {
        if (sisa <= 0) break;
        const potong = Math.min(sisa, subtotal[catId]);
        if (potong > 1000) {
          recs.push({
            id: `cut-${catId}`, level: "error",
            title: `Pangkas ${NAMA(catId)} sebesar ${rupiah(potong)}`,
            detail: `Total RAB melebihi pagu maksimum ${rupiah(pagu.max)} sejumlah ${rupiah(excess)}. Mengurangi ${NAMA(catId)} membantu kembali ke dalam pagu.`,
            catId, delta: -potong,
          });
          sisa -= potong;
        }
      }
      if (sisa > 1000) {
        recs.push({
          id: "cut-sisa", level: "error",
          title: `Masih perlu memangkas ${rupiah(sisa)} lagi`,
          detail: `Setelah efisiensi peralatan/perjalanan/sewa, total masih melebihi pagu maksimum. Tinjau ulang honorarium atau kurangi volume item lain secara manual.`,
        });
      }
    }

    if (total < pagu.min - 1e-6) {
      const kurang = pagu.min - total;
      const keBahan = Math.round(kurang * 0.6);
      const keData = kurang - keBahan;
      recs.push({
        id: "add-bahan-min", level: "warn",
        title: `Tambah Belanja Bahan Penelitian sebesar ${rupiah(keBahan)}`,
        detail: `Total RAB ${rupiah(total)} masih di bawah pagu minimum ${rupiah(pagu.min)}. Menambah dana habis pakai lebih aman di mata reviewer dibanding menambah honor/aset.`,
        catId: "bahan", delta: keBahan,
      });
      if (keData > 1000) {
        recs.push({
          id: "add-data-min", level: "warn",
          title: `Tambah Pengumpulan & Analisis Data sebesar ${rupiah(keData)}`,
          detail: `Sisa kekurangan pagu minimum dialokasikan ke komponen data agar proporsional.`,
          catId: "data", delta: keData,
        });
      }
    }

    const honorMax = b.honor * total;
    if (b.honor && subtotal.honor > honorMax + 1e-6) {
      const potong = subtotal.honor - honorMax;
      recs.push({
        id: "cut-honor", level: "error",
        title: `Kurangi Honorarium sebesar ${rupiah(potong)}`,
        detail: `Honorarium ${pct(subtotal.honor / total)} melebihi batas ${pct(b.honor)} (maks ${rupiah(honorMax)}). Batas ini ketat ditelaah reviewer BIMA.`,
        catId: "honor", delta: -potong,
      });
    }

    const peralMax = b.peralatan * total;
    if (b.peralatan && subtotal.peralatan > peralMax + 1e-6) {
      const potong = subtotal.peralatan - peralMax;
      recs.push({
        id: "cut-peralatan", level: "error",
        title: `Kurangi Peralatan Penunjang sebesar ${rupiah(potong)}`,
        detail: `Peralatan (aset) ${pct(subtotal.peralatan / total)} melebihi batas wajar ${pct(b.peralatan)}. Pertimbangkan menyewa (komponen Sewa) daripada membeli, atau alihkan ke Belanja Bahan.`,
        catId: "peralatan", delta: -potong,
      });
    }

    const perjalMax = b.perjalanan * total;
    if (b.perjalanan && subtotal.perjalanan > perjalMax + 1e-6) {
      const potong = subtotal.perjalanan - perjalMax;
      recs.push({
        id: "cut-perjalanan", level: "warn",
        title: `Efisiensikan Perjalanan Dinas sebesar ${rupiah(potong)}`,
        detail: `Perjalanan ${pct(subtotal.perjalanan / total)} di atas ambang ${pct(b.perjalanan)}. Pertimbangkan menggabungkan perjalanan atau memakai rapat daring.`,
        catId: "perjalanan", delta: -potong,
      });
    }

    const hpFrac = habisPakai / total;
    if (hpFrac < skema.minHabisPakai - 1e-6) {
      const butuh = skema.minHabisPakai * total - habisPakai;
      const sumberGeser = subtotal.peralatan > 0 ? "peralatan" : subtotal.sewa > 0 ? "sewa" : null;
      if (sumberGeser) {
        const geser = Math.min(butuh, subtotal[sumberGeser]);
        if (geser > 1000) {
          recs.push({
            id: "shift-habispakai", level: "warn",
            title: `Geser ${rupiah(geser)} dari ${NAMA(sumberGeser)} ke Belanja Bahan`,
            detail: `Dana habis pakai saat ini ${pct(hpFrac)}, idealnya ≥ ${pct(skema.minHabisPakai)}. Menggeser dana ini menaikkan porsi habis pakai tanpa mengubah total RAB.`,
            catId: sumberGeser, delta: -geser,
            pasangan: { catId: "bahan", delta: geser },
          });
        }
      }
    }

    if (subtotal.bahan / total < 0.05 && skema.sumber === "diktisaintek") {
      const x = (0.05 * total - subtotal.bahan) / 0.95;
      if (x > 1000) {
        recs.push({
          id: "add-bahan-5pct", level: "warn",
          title: `Tambah Belanja Bahan sebesar ${rupiah(x)}`,
          detail: `Belanja bahan saat ini < 5% dari total, tidak lazim untuk penelitian empiris dan rentan dicurigai reviewer.`,
          catId: "bahan", delta: x,
        });
      }
    }

    if (subtotal.lain / total < 0.03) {
      const x = (0.03 * total - subtotal.lain) / 0.97;
      if (x > 1000) {
        recs.push({
          id: "add-lain-3pct", level: "warn",
          title: `Tambah Pelaporan & Publikasi sebesar ${rupiah(x)}`,
          detail: `Publikasi & pelaporan < 3% — luaran wajib (artikel/laporan) butuh anggaran nyata (biaya submit APC, penggandaan, dsb).`,
          catId: "lain", delta: x,
        });
      }
    }

    const hargaAcuan = HARGA_ACUAN[skemaId] || HARGA_ACUAN.umum;
    for (const cat of CATEGORIES) {
      const kosong = items[cat.id].filter((it) => it.label.trim() && (!it.harga || Number(it.harga) <= 0));
      if (kosong.length) {
        const acuanArr = (hargaAcuan[cat.id] || []).filter((h) => h > 0);
        const rerata = acuanArr.length ? Math.round(acuanArr.reduce((a, c) => a + c, 0) / acuanArr.length) : 0;
        recs.push({
          id: `harga-kosong-${cat.id}`, level: "warn",
          title: `Lengkapi harga satuan pada ${NAMA(cat.id)}`,
          detail: `${kosong.length} item belum memiliki harga satuan.${rerata > 0 ? ` Acuan harga satuan skema ini sekitar ${rupiah(rerata)} per item.` : ""}`,
          ...(rerata > 0 ? { catId: cat.id, action: "fill-harga", nilai: rerata } : {}),
        });
      }
    }

    // Uraian yang masih kosong/terlalu singkat atau belum diubah dari template default
    // rawan dianggap "tidak jelas" oleh reviewer — beri contoh uraian detail per komponen.
    for (const cat of CATEGORIES) {
      const berbiaya = items[cat.id].filter((it) => Number(it.harga) > 0 && (Number(it.vol) || 0) > 0);
      const perluDetail = berbiaya.filter((it) => isUraianGenerik(cat.id, it.label));
      if (perluDetail.length) {
        const contoh = CONTOH_URAIAN[cat.id]?.[0];
        recs.push({
          id: `uraian-detail-${cat.id}`, level: "warn",
          title: `Perjelas uraian item pada ${NAMA(cat.id)}`,
          detail: `${perluDetail.length} item masih kosong/generik (belum menyebut spesifikasi/tujuan). ${CATEGORY_TIPS[cat.id] || ""}${contoh ? ` Contoh uraian detail: “${contoh}”.` : ""}`,
          ...(contoh ? { catId: cat.id, action: "fill-uraian" } : {}),
        });
      }
    }

    return recs;
  }, [subtotal, total, habisPakai, skema, items, skemaId, pagu]);

  // Rekomendasi yang bisa dieksekusi otomatis (punya catId — baik penyesuaian rupiah
  // maupun aksi isi-otomatis uraian/harga) — dipakai oleh tombol "Terapkan Semua".
  // Rekomendasi murni informasional (mis. "cut-sisa", perlu tinjauan manual) tidak disertakan.
  const actionableRekomendasi = useMemo(() => rekomendasi.filter((r) => r.catId), [rekomendasi]);

  // Menerapkan penyesuaian rupiah dari rekomendasi AI ke item RAB.
  // Penambahan disisipkan sebagai baris baru; pengurangan memangkas item bernilai
  // terbesar dalam komponen tsb terlebih dahulu agar harga tidak pernah negatif.
  // PENTING: updater harus murni (pure) — semua nilai (termasuk sisa potongan)
  // dihitung ulang dari parameter di dalam closure, bukan dari variabel di luar,
  // karena React (mode Strict) bisa memanggil updater lebih dari sekali.
  const applyDelta = (catId, delta) => {
    const bulat = Math.round(delta);
    if (bulat === 0) return;
    if (bulat > 0) {
      setItems((prev) => ({
        ...prev,
        [catId]: [...prev[catId], { id: nextRowId(), label: "Penyesuaian alokasi (rekomendasi AI)", vol: 1, sat: "-", vol2: 1, sat2: "-", harga: bulat }],
      }));
    } else {
      setItems((prev) => {
        let sisaPotong = -bulat;
        const arr = prev[catId].map((it) => ({ ...it }));
        const urutan = arr.map((_, idx) => idx).sort((a, c) => jumlahItem(arr[c]) - jumlahItem(arr[a]));
        for (const idx of urutan) {
          if (sisaPotong <= 0) break;
          const it = arr[idx];
          const denom = (Number(it.vol) || 0) * (Number(it.vol2) || 1);
          if (denom <= 0) continue;
          const jumlahSaatIni = denom * (Number(it.harga) || 0);
          const potong = Math.min(sisaPotong, jumlahSaatIni);
          it.harga = Math.max(0, Math.round((jumlahSaatIni - potong) / denom));
          sisaPotong -= potong;
        }
        return { ...prev, [catId]: arr };
      });
    }
  };
  const applyRekomendasi = (rec) => {
    if (rec.action === "fill-uraian") { applyFillUraian(rec.catId); return; }
    if (rec.action === "fill-harga") { applyFillHarga(rec.catId, rec.nilai); return; }
    if (rec.catId) applyDelta(rec.catId, rec.delta);
    if (rec.pasangan) applyDelta(rec.pasangan.catId, rec.pasangan.delta);
  };

  // Mengisi otomatis semua uraian yang masih generik pada satu komponen dengan contoh
  // uraian detail (bergiliran bila item generik lebih banyak dari jumlah contoh yang ada).
  // Updater murni: penghitung urutan contoh dihitung ulang di dalam closure setiap invokasi.
  const applyFillUraian = (catId, yearIdx = activeTahun) => {
    const contohArr = CONTOH_URAIAN[catId] || [];
    if (!contohArr.length) return;
    setItemsForYear(yearIdx, (prev) => {
      let i = 0;
      const arr = prev[catId].map((it) => {
        if (Number(it.harga) > 0 && (Number(it.vol) || 0) > 0 && isUraianGenerik(catId, it.label)) {
          const text = contohArr[i % contohArr.length];
          i += 1;
          return { ...it, label: text };
        }
        return it;
      });
      return { ...prev, [catId]: arr };
    });
  };

  // Mengisi otomatis harga satuan yang masih kosong pada satu komponen dengan harga acuan skema.
  const applyFillHarga = (catId, nilai, yearIdx = activeTahun) => {
    const bulat = Math.round(nilai);
    if (!bulat) return;
    setItemsForYear(yearIdx, (prev) => ({
      ...prev,
      [catId]: prev[catId].map((it) => (it.label.trim() && (!it.harga || Number(it.harga) <= 0) ? { ...it, harga: bulat } : it)),
    }));
  };

  const bar = (frac, color) => (
    <div style={{ background: "#EDE7DE", height: 8, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, frac * 100))}%`, height: "100%", background: color, transition: "width .3s" }} />
    </div>
  );

  const skorColor = skorRealistis >= 80 ? "#1B5E4F" : skorRealistis >= 55 ? "#B5820A" : "#A23B23";
  // Varian terang untuk dipakai di atas latar gelap header (kontras cukup di background gradasi)
  const heroSkorColor = skorRealistis >= 80 ? "#8FE3C0" : skorRealistis >= 55 ? "#F5D68A" : "#F3A08A";

  return (
    <div style={{
      fontFamily: "'DM Sans', system-ui, sans-serif",
      background: "#FBF8F2", minHeight: "100vh", color: "#2A241C", padding: "0 0 60px",
      "--accent": sumber.warna,
      WebkitFontSmoothing: "antialiased", textRendering: "optimizeLegibility",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::selection{ background: var(--accent); color:#fff; }
        ::-webkit-scrollbar{ width:10px; height:10px; }
        ::-webkit-scrollbar-track{ background:transparent; }
        ::-webkit-scrollbar-thumb{ background:#DDD2BC; border-radius:10px; }
        ::-webkit-scrollbar-thumb:hover{ background:#C9BC9E; }
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
        .scroll-hint{ display:none; }
        @media (max-width: 720px) {
          .grid-2col, .grid-3col{ grid-template-columns:1fr; gap:14px; }
          h1{ font-size:28px !important; }
          header{ padding:28px 18px 34px !important; }
          main{ padding:0 12px !important; gap:14px !important; }
          section, .card-hover{ padding:16px !important; }
          .tab-btn{ padding:8px 12px !important; font-size:12.5px !important; }
          .btn-ghost, .btn-primary{ font-size:12px !important; padding:7px 10px !important; }
          .scroll-hint{ display:flex !important; }
          .hero-row{ align-items: stretch !important; }
          .hero-stat-card{ width:100% !important; }
        }
        @media (max-width: 480px) {
          h1{ font-size:23px !important; }
          .icon-badge{ width:26px !important; height:26px !important; font-size:12px !important; }
          .hero-stat-card{ padding:16px 18px !important; }
        }
        .card-hover{ transition: transform .2s ease, box-shadow .2s ease; }
        .card-hover:hover{ transform: translateY(-3px); box-shadow: 0 6px 14px rgba(60,50,30,.10), 0 18px 32px rgba(60,50,30,.08) !important; }
        .tab-hidden{ display:none !important; }
        .tab-btn{ transition: all .18s ease; }
        .tab-btn:not(.tab-btn-active):hover{ color: var(--accent) !important; }
        .btn-ghost{ transition: all .15s ease; }
        .btn-ghost:hover{ border-color: var(--accent) !important; color: var(--accent) !important; box-shadow: 0 3px 10px rgba(60,50,30,.08) !important; transform: translateY(-1px); }
        .btn-primary{ transition: all .15s ease; }
        .btn-primary:hover{ filter: brightness(1.1); box-shadow: 0 6px 18px rgba(0,0,0,.24) !important; transform: translateY(-1px); }
        .rab-row:hover td{ background: #FBF8F2; }
        .rab-row td{ transition: background .12s ease; }
        .rab-row:nth-child(even) td{ background: #FBF9F4; }
        .rab-row:nth-child(even):hover td{ background: #F5EFE2; }
        .icon-badge{ display:inline-flex; align-items:center; justify-content:center; border-radius:10px; flex-shrink:0; }
        .print-only{ display:none; }
        @media print {
          .print-only{ display:block !important; }
          .no-print{ display:none !important; }
          .tab-hidden{ display:block !important; }
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
        position: "relative", overflow: "hidden",
        background: `
          radial-gradient(circle at 88% -15%, rgba(255,255,255,.18), transparent 40%),
          radial-gradient(circle at 4% 115%, rgba(0,0,0,.22), transparent 55%),
          linear-gradient(155deg, ${sumber.warna} 0%, ${sumber.warna}E6 48%, #221C12 130%)
        `,
        color: "#FBF8F2", padding: "40px 28px 34px",
        boxShadow: "0 18px 44px rgba(0,0,0,.24)",
      }}>
        {/* Watermark dekoratif — motif cincin monogram premium, tidak mengganggu keterbacaan */}
        <div aria-hidden="true" style={{
          position: "absolute", top: -70, right: -50, width: 320, height: 320, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.13)", pointerEvents: "none",
        }} />
        <div aria-hidden="true" style={{
          position: "absolute", top: -26, right: 30, width: 210, height: 210, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.09)", pointerEvents: "none",
        }} />
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px)",
          backgroundSize: "18px 18px", opacity: .3, pointerEvents: "none",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,.6), transparent 70%)",
          WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,.6), transparent 70%)",
        }} />
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: 3,
          background: "linear-gradient(90deg, transparent, #E8C97A, #FBF8F2, #E8C97A, transparent)", opacity: .85,
        }} />

        <div className="hero-row" style={{
          position: "relative", maxWidth: 1080, margin: "0 auto",
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30, flexWrap: "wrap",
        }}>
          {/* Kolom kiri — identitas produk & judul */}
          <div style={{ flex: "1 1 340px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{
                width: 42, height: 42, borderRadius: 12, background: "linear-gradient(150deg, rgba(255,255,255,.24), rgba(255,255,255,.05))",
                border: "1px solid rgba(255,255,255,.32)", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 16, letterSpacing: .5, flexShrink: 0,
                boxShadow: "0 6px 16px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.25)",
              }}>RB</span>
              <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                <div style={{ fontFamily: "'DM Sans'", fontSize: 11.5, letterSpacing: 2.6, textTransform: "uppercase", fontWeight: 700, color: "#F1DDAE" }}>
                  Sistem Penyusun RAB
                </div>
                <div style={{ fontSize: 12, opacity: .72, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Prodi Teknik Informatika · ITB Asia
                </div>
              </div>
            </div>

            <h1 style={{
              fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 40, margin: "0 0 10px", lineHeight: 1.05, letterSpacing: -0.5,
              backgroundImage: "linear-gradient(120deg, #FFFDF8 35%, #F1DDAE 65%, #FFFDF8 100%)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              filter: "drop-shadow(0 2px 18px rgba(0,0,0,.16))",
            }}>
              Sistem RAB Hibah
            </h1>
            <p style={{ margin: "0 0 16px", maxWidth: 560, opacity: .92, fontSize: 14.5, lineHeight: 1.6 }}>
              Susun Rencana Anggaran Biaya proposal hibah per komponen & item, lengkap dengan
              validasi batas komponen, model multi tahun, dan pemisahan dana habis pakai —
              agar anggaran lolos telaah reviewer.
            </p>
            <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: 20, letterSpacing: .3,
                background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.24)", color: "#FBF8F2",
              }}>
                {skema.nama.split("(")[0].trim()}
              </span>
              <span style={{
                fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: 20, letterSpacing: .3,
                background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.24)", color: "#FBF8F2",
              }}>
                Durasi {skema.durasi}
              </span>
              {jumlahTahun > 1 && (
                <span style={{
                  fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: 20, letterSpacing: .3,
                  background: "rgba(232,201,122,.22)", border: "1px solid rgba(232,201,122,.4)", color: "#FBF3DE",
                }}>
                  📅 Model {jumlahTahun} Tahun
                </span>
              )}
            </div>
          </div>

          {/* Kolom kanan — ringkasan langsung, kartu kaca premium */}
          <div className="hero-stat-card no-print" style={{
            flex: "0 1 268px", minWidth: 240,
            background: "rgba(255,255,255,.09)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,.22)", borderRadius: 18,
            padding: "20px 22px", boxShadow: "0 20px 44px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.16)",
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", opacity: .72 }}>
              {jumlahTahun > 1 ? `Total Keseluruhan (${jumlahTahun} Th)` : "Total Rencana Anggaran"}
            </div>
            <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 27, marginTop: 4, lineHeight: 1.15 }}>
              {rupiah(jumlahTahun > 1 ? totalKeseluruhan : total)}
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,.18)", margin: "16px 0" }} />
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: .72 }}>Skor Realistis</div>
                <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 19, marginTop: 3, color: heroSkorColor }}>
                  {skorRealistis}<span style={{ fontSize: 12, opacity: .7 }}> /100</span>
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,.18)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", opacity: .72 }}>Tingkat</div>
                <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 14, marginTop: 5, lineHeight: 1.25 }}>
                  {skema.tkt.split("·")[0].trim()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>


      <main style={{ maxWidth: 1080, margin: "-24px auto 0", padding: "0 20px", display: "grid", gap: 20 }}>

        {/* Kop dokumen resmi \u2014 hanya tampil saat cetak, siap ditempel ke proposal */}
        <div className="print-only" style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 20 }}>RENCANA ANGGARAN BIAYA (RAB)</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{skema.nama}</div>
          <div style={{ fontSize: 11.5, color: "#6B6252" }}>Sumber Dana: {sumber.nama} · Durasi {skema.durasi}</div>
        </div>
        <table className="print-only" style={{ width: "100%", fontSize: 12, margin: "6px 0 4px", borderCollapse: "collapse" }}>
          <tbody>
            <tr><td style={{ padding: "3px 6px", fontWeight: 600, width: 170 }}>Program Studi</td><td style={{ padding: "3px 6px" }}>: {progStudi || "-"}</td></tr>
            <tr><td style={{ padding: "3px 6px", fontWeight: 600 }}>Ketua Peneliti</td><td style={{ padding: "3px 6px" }}>: {namaKetua || "-"}</td></tr>
            <tr><td style={{ padding: "3px 6px", fontWeight: 600 }}>Skema Hibah</td><td style={{ padding: "3px 6px" }}>: {skema.nama}</td></tr>
            <tr><td style={{ padding: "3px 6px", fontWeight: 600 }}>Pagu {paguKustom ? "Kustom" : "Skema"} (per tahun)</td><td style={{ padding: "3px 6px" }}>: {rupiah(pagu.min)} – {rupiah(pagu.max)}</td></tr>
            <tr><td style={{ padding: "3px 6px", fontWeight: 600 }}>Durasi Pelaksanaan</td><td style={{ padding: "3px 6px" }}>: {jumlahTahun} tahun</td></tr>
            <tr><td style={{ padding: "3px 6px", fontWeight: 600 }}>Total Keseluruhan ({jumlahTahun} Tahun)</td><td style={{ padding: "3px 6px", fontWeight: 700 }}>: {rupiah(totalKeseluruhan)}</td></tr>
          </tbody>
        </table>

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
              <div>
                <label style={lbl} htmlFor="input-tahun">Durasi Pelaksanaan (Model Multi Tahun)</label>
                <select
                  id="input-tahun" style={select} value={jumlahTahun}
                  onChange={(e) => ubahJumlahTahun(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} Tahun{n > 1 ? ` (Tahun 1${"–"}${n})` : " (Tunggal)"}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11.5, color: "#8A7A5C", marginTop: 6, marginBottom: 0 }}>
                  Acuan durasi skema: {skema.durasi}. Setiap tahun punya rincian item & pagu tersendiri — beralih via tab tahun di "Rincian Item".
                </p>
              </div>
            </div>
          </div>

          {/* Pagu kustom — pengaju bisa mengganti sendiri plafon hibah, mis. skema internal/mitra yang berbeda dari acuan default */}
          <div className="no-print" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F0EADF" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: "#3A3226", cursor: "pointer" }}>
                <input
                  type="checkbox" checked={paguKustom}
                  onChange={(e) => setPaguKustom(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: sumber.warna, cursor: "pointer" }}
                  aria-label="Gunakan pagu hibah kustom"
                />
                💰 Gunakan pagu hibah kustom
              </label>
              <span style={{ fontSize: 12, color: "#8A7A5C" }}>
                Acuan skema: {rupiah(skema.paguMin)} – {rupiah(skema.paguMax)}
              </span>
            </div>
            {paguKustom && (
              <div className="grid-2col" style={{ marginTop: 12 }}>
                <div>
                  <label style={lbl} htmlFor="input-pagu-min">Pagu Minimum Diajukan (Rp)</label>
                  <input
                    id="input-pagu-min" className="num-input" type="number" min="0" step="1000000"
                    style={{ ...inputText, width: "100%" }} value={paguMinKustom}
                    onChange={(e) => setPaguMinKustom(e.target.value)}
                    aria-label="Pagu minimum kustom (Rp)"
                  />
                </div>
                <div>
                  <label style={lbl} htmlFor="input-pagu-max">Pagu Maksimum Diajukan (Rp)</label>
                  <input
                    id="input-pagu-max" className="num-input" type="number" min="0" step="1000000"
                    style={{ ...inputText, width: "100%" }} value={paguMaxKustom}
                    onChange={(e) => setPaguMaxKustom(e.target.value)}
                    aria-label="Pagu maksimum kustom (Rp)"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Navigasi tab */}
        <div className="no-print" style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 6, background: "#F0EADF", padding: 5, borderRadius: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { id: "dashboard", label: "📊 Dashboard" },
              { id: "rincian", label: "📝 Rincian Item" },
              { id: "rekomendasi", label: `🤖 Rekomendasi AI${rekomendasi.length ? ` (${rekomendasi.length})` : ""}` },
              { id: "telaah", label: `✅ Telaah Anggaran${validasi.length ? ` (${validasi.length})` : ""}` },
            ].map((t) => (
              <button
                key={t.id}
                className={`tab-btn${activeTab === t.id ? " tab-btn-active" : ""}`}
                onClick={() => setActiveTab(t.id)}
                style={{
                  border: "none", padding: "9px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 700,
                  fontFamily: "inherit", cursor: "pointer",
                  background: activeTab === t.id ? "#fff" : "transparent",
                  color: activeTab === t.id ? sumber.warna : "#8A7A5C",
                  boxShadow: activeTab === t.id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== DASHBOARD ===== */}
        <div className={`tab-panel ${activeTab === "dashboard" ? "" : "tab-hidden"}`} style={{ display: "grid", gap: 20 }}>
          {jumlahTahun > 1 && (
            <section className="card-hover" style={card}>
              <div style={metricLbl}>📅 Ringkasan Multi Tahun ({jumlahTahun} Tahun Pelaksanaan)</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
                {totalPerTahun.map((t, i) => (
                  <button
                    key={i} onClick={() => { setActiveTahun(i); setActiveTab("rincian"); }}
                    style={{
                      flex: "1 1 140px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                      border: activeTahun === i ? "1.5px solid " + sumber.warna : "1.5px solid #E4DCCF",
                      background: activeTahun === i ? sumber.warna + "0F" : "#FBF8F2",
                      borderRadius: 10, padding: "10px 14px",
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A7A5C", textTransform: "uppercase" }}>Tahun {i + 1}</div>
                    <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 17, color: "#2A241C", marginTop: 2 }}>{rupiah(t)}</div>
                  </button>
                ))}
                <div style={{
                  flex: "1 1 160px", borderRadius: 10, padding: "10px 14px",
                  background: sumber.warna + "16", border: `1.5px solid ${sumber.warna}44`,
                }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: sumber.warna, textTransform: "uppercase" }}>Total Keseluruhan</div>
                  <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 17, color: sumber.warna, marginTop: 2 }}>{rupiah(totalKeseluruhan)}</div>
                </div>
              </div>
            </section>
          )}

          {/* Skor + ringkasan habis pakai */}
          <section className="grid-3col">
            <div className="card-hover" style={{ ...card, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <span className="icon-badge" style={{ width: 34, height: 34, fontSize: 16, background: skorColor + "16" }}>🎯</span>
              </div>
              <div style={metricLbl}>Skor Realistis</div>
              <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 44, color: skorColor, lineHeight: 1 }}>
                {skorRealistis}
              </div>
              <div style={{ fontSize: 12, color: "#8A7A5C" }}>
                {skorRealistis >= 80 ? "Anggaran sehat" : skorRealistis >= 55 ? "Perlu perbaikan" : "Rawan ditolak reviewer"}
              </div>
            </div>
            <div className="card-hover" style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span className="icon-badge" style={{ width: 30, height: 30, fontSize: 14, background: "#1B5E4F16" }}>💰</span>
                <div style={{ ...metricLbl, marginBottom: 0 }}>Dana Habis Pakai</div>
              </div>
              <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, color: "#1B5E4F" }}>
                {rupiah(habisPakai)}
              </div>
              <div style={{ fontSize: 12, color: "#8A7A5C", marginBottom: 8 }}>{pct(total > 0 ? habisPakai / total : 0)} dari total</div>
              {bar(total > 0 ? habisPakai / total : 0, "#1B5E4F")}
            </div>
            <div className="card-hover" style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span className="icon-badge" style={{ width: 30, height: 30, fontSize: 14, background: "#7A3E1D16" }}>🏗️</span>
                <div style={{ ...metricLbl, marginBottom: 0 }}>Tidak Habis Pakai (aset)</div>
              </div>
              <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, color: "#7A3E1D" }}>
                {rupiah(tidakHabisPakai)}
              </div>
              <div style={{ fontSize: 12, color: "#8A7A5C", marginBottom: 8 }}>{pct(total > 0 ? tidakHabisPakai / total : 0)} dari total</div>
              {bar(total > 0 ? tidakHabisPakai / total : 0, "#7A3E1D")}
            </div>
          </section>

          {/* Komposisi & ranking komponen */}
          <section className="grid-2col">
            <div className="card-hover" style={card}>
              <div style={metricLbl}>🧭 Komposisi Anggaran per Komponen</div>
              <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
                <div style={{ width: 148, height: 148, borderRadius: "50%", background: donutGradient, position: "relative", flexShrink: 0 }}>
                  <div style={{
                    position: "absolute", inset: 20, borderRadius: "50%", background: "#fff",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
                    boxShadow: "inset 0 0 0 1px #F0EADF",
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#8A7A5C", textTransform: "uppercase", letterSpacing: .5 }}>Total</div>
                    <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 13, color: "#2A241C" }}>{rupiah(total)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 190 }}>
                  {sortedCats.map((cat) => (
                    <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: CATEGORY_META[cat.id].color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "#4A4236" }}>{cat.title.replace(/^\d+\.\s*/, "")}</span>
                      <span style={{ fontWeight: 700, color: "#2A241C" }}>{pct(total > 0 ? subtotal[cat.id] / total : 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-hover" style={card}>
              <div style={metricLbl}>📈 Ranking Alokasi Komponen</div>
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {sortedCats.map((cat) => (
                  <div key={cat.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{CATEGORY_META[cat.id].icon} {cat.title.replace(/^\d+\.\s*/, "")}</span>
                      <span style={{ fontWeight: 700 }}>{rupiah(subtotal[cat.id])}</span>
                    </div>
                    {bar(total > 0 ? subtotal[cat.id] / total : 0, CATEGORY_META[cat.id].color)}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Toolbar */}
        <section style={{ ...card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }} className="no-print">
          <button className="btn-ghost" onClick={muatTemplate} style={btnGhost}>Muat Template Default</button>
          <button className="btn-ghost" onClick={kosongkanSemua} style={btnGhost}>Kosongkan Semua</button>
          <span style={{ fontSize: 12, color: "#8A7A5C", opacity: tersimpan ? 1 : 0, transition: "opacity .3s" }}>
            ✓ Draft tersimpan otomatis
          </span>
          <div style={{ flex: 1 }} />
          <input
            className="num-input" type="number" placeholder="Target total (Rp)" aria-label="Target total anggaran (Rp)"
            value={targetDana} onChange={(e) => setTargetDana(e.target.value)}
            style={{ ...numBox, width: 160, textAlign: "left" }}
          />
          <button className="btn-ghost" onClick={skalakan} style={btnGhost}>Skalakan Harga ke Target</button>
          <label htmlFor="import-csv-input" className="btn-ghost" style={{ ...btnGhost, display: "inline-block" }}>Impor CSV/Excel</label>
          <input id="import-csv-input" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel" onChange={handleImportFile} style={{ display: "none" }} />
          <button className="btn-ghost" onClick={exportCSV} style={btnGhost}>Unduh CSV</button>
          <button className="btn-ghost" onClick={exportXLS} style={btnGhost}>Unduh Excel (.xls)</button>
          <button className="btn-primary" onClick={() => window.print()} style={btnPrimary(sumber.warna)}>Cetak / Simpan PDF</button>
        </section>

        {/* Rincian Item RAB per komponen */}
        <section className={`tab-panel ${activeTab === "rincian" ? "" : "tab-hidden"}`} style={card}>
          <h2 style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, margin: "0 0 16px" }}>Rincian Item RAB</h2>
          <div className="no-print scroll-hint" style={{ fontSize: 11.5, color: "#8A7A5C", marginBottom: 10, alignItems: "center", gap: 6 }}>
            ↔ Geser tabel ke samping untuk melihat semua kolom
          </div>

          {jumlahTahun > 1 && (
            <div className="no-print" role="tablist" aria-label="Pilih tahun pelaksanaan" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {itemsByTahun.map((_, yi) => (
                <button
                  key={yi} role="tab" aria-selected={activeTahun === yi} onClick={() => setActiveTahun(yi)}
                  style={{
                    border: activeTahun === yi ? "1.5px solid " + sumber.warna : "1.5px solid #E4DCCF",
                    background: activeTahun === yi ? sumber.warna + "16" : "#fff",
                    color: activeTahun === yi ? sumber.warna : "#6B6252",
                    padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Tahun {yi + 1}
                </button>
              ))}
            </div>
          )}

          {itemsByTahun.map((yearItems, yi) => (
            <div key={yi} className={activeTahun === yi ? "" : "tab-hidden"}>
              {jumlahTahun > 1 && (
                <div className="print-only" style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 17, margin: "18px 0 10px", borderBottom: "2px solid #E4DCCF", paddingBottom: 6 }}>
                  Tahun ke-{yi + 1}
                </div>
              )}
              {CATEGORIES.map((cat) => (
                <CategoryBlock
                  key={cat.id}
                  cat={cat}
                  rows={yearItems[cat.id]}
                  subtotalVal={subtotalPerTahun[yi][cat.id]}
                  total={totalPerTahun[yi]}
                  onUpdate={(rowId, field, value) => updateItem(cat.id, rowId, field, value, yi)}
                  onAdd={() => addRow(cat.id, yi)}
                  onRemove={(rowId) => removeRow(cat.id, rowId, yi)}
                  onDuplicate={(rowId) => duplicateRow(cat.id, rowId, yi)}
                  onUseContoh={(text) => useContoh(cat.id, text, yi)}
                />
              ))}

              {/* Total tahun berjalan */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                paddingTop: 16, marginTop: 4, borderTop: "2px solid #E4DCCF",
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    TOTAL RAB {jumlahTahun > 1 ? `TAHUN KE-${yi + 1}` : "RENCANA ANGGARAN BIAYA"}
                  </div>
                  <div style={{ fontSize: 12, color: totalPerTahun[yi] > pagu.max ? "#A23B23" : totalPerTahun[yi] < pagu.min ? "#B5820A" : "#1B5E4F", fontWeight: 600, marginTop: 2 }}>
                    Pagu {paguKustom ? "kustom" : "skema"} (per tahun) {rupiah(pagu.min)} – {rupiah(pagu.max)}
                    {totalPerTahun[yi] > pagu.max ? " · melebihi pagu maksimum" : totalPerTahun[yi] < pagu.min ? " · di bawah pagu minimum" : " · dalam pagu"}
                  </div>
                </div>
                <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 26, color: sumber.warna }}>
                  {rupiah(totalPerTahun[yi])}
                </div>
              </div>

              {/* Blok khusus cetak: ringkasan kepatuhan komponen tahun ini */}
              <div className="print-only" style={{ marginTop: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  Ringkasan Kepatuhan Komponen — {skema.nama}{jumlahTahun > 1 ? ` (Tahun ke-${yi + 1})` : ""}
                </div>
                <table style={{ width: "100%", fontSize: 11.5, borderCollapse: "collapse", marginBottom: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", borderBottom: "1px solid #999", padding: "3px 6px" }}>Komponen</th>
                      <th style={{ borderBottom: "1px solid #999", padding: "3px 6px" }}>Realisasi</th>
                      <th style={{ borderBottom: "1px solid #999", padding: "3px 6px" }}>Batas Skema</th>
                      <th style={{ borderBottom: "1px solid #999", padding: "3px 6px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Honorarium", nilai: subtotalPerTahun[yi].honor / totalPerTahun[yi], batas: skema.batas.honor, arah: "maks" },
                      { label: "Peralatan (tidak habis pakai)", nilai: subtotalPerTahun[yi].peralatan / totalPerTahun[yi], batas: skema.batas.peralatan, arah: "maks" },
                      { label: "Perjalanan Dinas", nilai: subtotalPerTahun[yi].perjalanan / totalPerTahun[yi], batas: skema.batas.perjalanan, arah: "maks" },
                      { label: "Dana Habis Pakai", nilai: habisPakaiPerTahun[yi] / totalPerTahun[yi], batas: skema.minHabisPakai, arah: "min" },
                    ].map((r) => {
                      const sesuai = r.arah === "maks" ? r.nilai <= r.batas + 1e-6 : r.nilai >= r.batas - 1e-6;
                      return (
                        <tr key={r.label}>
                          <td style={{ padding: "3px 6px" }}>{r.label}</td>
                          <td style={{ padding: "3px 6px", textAlign: "center" }}>{pct(r.nilai)}</td>
                          <td style={{ padding: "3px 6px", textAlign: "center" }}>{r.arah} {pct(r.batas)}</td>
                          <td style={{ padding: "3px 6px", textAlign: "center" }}>{sesuai ? "Sesuai" : "Perlu perbaikan"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Ringkasan Total Keseluruhan — tampil di layar & cetak saat multi tahun */}
          {jumlahTahun > 1 && (
            <div style={{
              marginTop: 20, padding: "16px 18px", borderRadius: 12,
              background: sumber.warna + "0F", border: `1.5px solid ${sumber.warna}33`,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>TOTAL KESELURUHAN ({jumlahTahun} Tahun)</div>
                <div style={{ fontSize: 12, color: "#6B6252", marginTop: 2 }}>
                  {totalPerTahun.map((t, i) => `Th.${i + 1}: ${rupiah(t)}`).join("  ·  ")}
                </div>
              </div>
              <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, fontSize: 26, color: sumber.warna }}>
                {rupiah(totalKeseluruhan)}
              </div>
            </div>
          )}

          {/* Blok khusus cetak: lembar pengesahan, siap ditempel ke proposal */}
          <div className="print-only" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, fontSize: 12, gap: 20 }}>
              <div style={{ textAlign: "center", width: "45%" }}>
                Mengetahui,<br />Ketua LPPM / Lembaga Penelitian
                <div style={{ height: 60 }} />
                ( .............................................. )
              </div>
              <div style={{ textAlign: "center", width: "45%" }}>
                Malang, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}<br />Ketua Peneliti
                <div style={{ height: 60 }} />
                {namaKetua ? `( ${namaKetua} )` : "( .............................................. )"}
              </div>
            </div>
          </div>
        </section>

        {/* Rekomendasi AI */}
        <section className={`tab-panel ${activeTab === "rekomendasi" ? "" : "tab-hidden"}`} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22, margin: "0 0 4px" }}>
                🤖 Rekomendasi AI
              </h2>
              <p style={{ fontSize: 13, color: "#6B6252", marginTop: 0, marginBottom: 0 }}>
                Analisis otomatis alokasi anggaran terhadap batas komponen skema {skema.nama.split("(")[0].trim()},
                lengkap dengan besaran rupiah spesifik yang disarankan untuk digeser/ditambah/dikurangi. Klik “Terapkan” untuk menyesuaikan satu rekomendasi, atau “Terapkan Semua” untuk sekaligus.
              </p>
            </div>
            {actionableRekomendasi.length > 0 && (
              <button
                className="no-print"
                onClick={() => actionableRekomendasi.forEach((r) => applyRekomendasi(r))}
                style={{ ...btnPrimary("#1B5E4F"), flexShrink: 0 }}
              >
                ⚡ Terapkan Semua ({actionableRekomendasi.length})
              </button>
            )}
          </div>
          {rekomendasi.length === 0 ? (
            <div style={{
              background: "#E3F0EA", color: "#1B5E4F", padding: "14px 16px", borderRadius: 10,
              fontWeight: 600, fontSize: 14, display: "flex", gap: 10, alignItems: "center",
            }}>
              ✓ Tidak ada rekomendasi tambahan — alokasi sudah proporsional untuk skema ini.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }} className="no-print">
              {rekomendasi.map((r) => (
                <div key={r.id} style={alertCard(r.level)}>
                  <span style={alertBadge(r.level)}>
                    {r.level === "error" ? "WAJIB" : "SARAN"}
                  </span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#2A241C", marginBottom: 3 }}>{r.title}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: "#3A322A" }}>{r.detail}</div>
                  </div>
                  {r.catId && (
                    <button className="btn-ghost" onClick={() => applyRekomendasi(r)} style={{ ...btnGhost, alignSelf: "center", flexShrink: 0 }}>
                      {r.action === "fill-uraian" ? "Isi Contoh Otomatis" : r.action === "fill-harga" ? "Isi Harga Acuan" : "Terapkan"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        <section className={`tab-panel ${activeTab === "telaah" ? "" : "tab-hidden"}`} style={card}>
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
                <div key={idx} style={alertCard(i.level)}>
                  <span style={alertBadge(i.level)}>
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
        <p className="no-print" style={{ fontSize: 11.5, color: "#9A9080", textAlign: "center", lineHeight: 1.6, margin: "0 20px 4px" }}>
          🔒 Seluruh isian di atas hanya disimpan di peramban (browser) perangkat ini — tidak dikirim atau
          disimpan di server manapun. Hanya satu draft yang tersimpan otomatis; membersihkan cache/data situs
          pada browser ini akan menghapusnya secara permanen. Unduh CSV/Excel secara berkala sebagai cadangan.
        </p>
        <p className="print-only" style={{ fontSize: 11, color: "#9A9080", textAlign: "right", margin: "0 20px" }}>
          Dicetak pada {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </main>
    </div>
  );
}

function CategoryBlock({ cat, rows, subtotalVal, total, onUpdate, onAdd, onRemove, onDuplicate, onUseContoh }) {
  const frac = total > 0 ? subtotalVal / total : 0;
  const contoh = CONTOH_URAIAN[cat.id] || [];
  const datalistId = `contoh-${cat.id}`;
  const accent = CATEGORY_META[cat.id]?.color || "#8A7A5C";
  return (
    <div className="rab-category" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="icon-badge" style={{ width: 28, height: 28, fontSize: 14, background: accent + "16" }}>{CATEGORY_META[cat.id]?.icon}</span>
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

      {CATEGORY_TIPS[cat.id] && (
        <div className="no-print" style={{
          fontSize: 11.5, color: "#8A7A5C",
          background: "#FBF8F2", border: "1px solid #F0EADF", borderRadius: 8, padding: "8px 10px 9px", marginBottom: 10, lineHeight: 1.5,
        }}>
          <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0 }}>💡</span>
            <span><strong style={{ color: "#6B6252" }}>Tips uraian:</strong> {CATEGORY_TIPS[cat.id]}</span>
          </div>
          {contoh.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7, paddingLeft: 21 }}>
              {contoh.map((c) => (
                <button
                  key={c} type="button" onClick={() => onUseContoh(c)}
                  title="Klik untuk mengisi salah satu baris uraian dengan contoh ini"
                  style={{
                    fontSize: 11, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", textAlign: "left",
                    padding: "4px 9px", borderRadius: 20, color: accent, background: accent + "12",
                    border: `1px solid ${accent}30`, lineHeight: 1.4, transition: "all .15s ease",
                  }}
                >
                  + {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: 32, borderBottomColor: accent }}>No</th>
              <th style={{ ...th, textAlign: "left", borderBottomColor: accent }}>Uraian</th>
              <th style={{ ...th, width: 56, borderBottomColor: accent }}>Vol</th>
              <th style={{ ...th, width: 64, borderBottomColor: accent }}>Sat</th>
              <th style={{ ...th, width: 56, borderBottomColor: accent }}>Vol2</th>
              <th style={{ ...th, width: 64, borderBottomColor: accent }}>Sat2</th>
              <th style={{ ...th, width: 130, borderBottomColor: accent }}>Harga Satuan (Rp)</th>
              <th style={{ ...th, width: 130, borderBottomColor: accent }}>Jumlah (Rp)</th>
              <th style={{ ...th, width: 32, borderBottomColor: accent }} className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {contoh.length > 0 && (
              <datalist id={datalistId}>
                {contoh.map((c) => <option key={c} value={c} />)}
              </datalist>
            )}
            {rows.map((it, idx) => {
              const kurangDetail = Number(it.harga) > 0 && (Number(it.vol) || 0) > 0 && isUraianGenerik(cat.id, it.label);
              return (
              <tr key={it.id} className="rab-row">
                <td style={td}>{idx + 1}</td>
                <td style={{ ...td, textAlign: "left" }}>
                  <input style={inputCell} value={it.label} aria-label={`Uraian item ${cat.title}`} list={datalistId}
                    onChange={(e) => onUpdate(it.id, "label", e.target.value)} placeholder={contoh[0] ? `Cth: ${contoh[0]}` : "Uraian item..."} />
                  {kurangDetail && (
                    <div className="no-print" style={{ fontSize: 10.5, color: "#B5820A", fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                      ⚠ Uraian belum spesifik — klik salah satu contoh di atas
                    </div>
                  )}
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
              );
            })}
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
const btnPrimary = (c) => ({
  border: "1.5px solid " + c, background: c, padding: "7px 15px", borderRadius: 8,
  fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", color: "#fff",
  boxShadow: "0 3px 10px rgba(0,0,0,.16)",
});
// Kartu peringatan (Rekomendasi AI & Telaah Anggaran) — aksen garis kiri berwarna
// sesuai tingkat urgensi, dipakai bersama agar kedua tab terasa satu bahasa desain.
const alertCard = (level) => ({
  display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap",
  background: level === "error" ? "#FDF2EF" : "#FDF8EC",
  border: "1px solid " + (level === "error" ? "#F0CFC3" : "#F0E2B8"),
  borderLeft: "4px solid " + (level === "error" ? "#A23B23" : "#B5820A"),
  padding: "13px 16px", borderRadius: 10, boxShadow: "0 1px 2px rgba(60,50,30,.05)",
});
const alertBadge = (level) => ({
  fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6, marginTop: 1, letterSpacing: .3,
  background: level === "error" ? "#A23B23" : "#B5820A", color: "#fff", flexShrink: 0,
});
const table = { borderCollapse: "collapse", width: "100%", minWidth: 720 };
const th = {
  fontSize: 11, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", color: "#8A7A5C",
  textAlign: "center", padding: "6px 6px", borderBottom: "2px solid #E4DCCF",
};
const td = {
  fontSize: 13, textAlign: "center", padding: "6px 6px", borderBottom: "1px solid #F0EADF",
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

// Fungsi murni (tanpa state React) diekspor terpisah agar bisa diuji unit test
// tanpa perlu me-render seluruh komponen App.
export {
  rupiah,
  pct,
  jumlahItem,
  clampNonNeg,
  parseCSVText,
  importItemsFromRows,
  isUraianGenerik,
  buildDefaultItems,
  CATEGORIES,
  SKEMA,
  HARGA_ACUAN,
};
