import { supabase } from "./supabaseClient.js";

// Menjaga maksimal satu request in-flight + satu request pending (dengan
// argumen TERBARU, bukan antrean semua perubahan) — dipakai baik untuk
// autosync RAB (App -> onSync) maupun edit field Pencairan Dana/Pengeluaran.
// `onError` (opsional) dipanggil setiap kali `fn` gagal — tanpa ini, gagal
// simpan akan silent (cuma ke console), jadi komponen UI SEBAIKNYA selalu
// memberi `onError` supaya penggunanya tahu perubahannya tidak tersimpan.
export function createDebouncedSaver(fn, delayMs = 800, onError) {
  let timer = null;
  let inFlight = false;
  let lastArgs = null;
  let pending = false;

  const runNow = async () => {
    if (!lastArgs) return;
    const args = lastArgs;
    inFlight = true;
    pending = false;
    try {
      await fn(...args);
    } catch (err) {
      if (onError) onError(err);
      else console.error("createDebouncedSaver: gagal menyimpan", err);
    } finally {
      inFlight = false;
      if (pending) runNow();
    }
  };

  function schedule(...args) {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (inFlight) pending = true;
      else runNow();
    }, delayMs);
  }

  // Jalankan sekarang (dipakai saat unmount/tab disembunyikan), pakai
  // argumen terakhir yang dijadwalkan, tanpa menunggu delay lagi.
  schedule.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (inFlight) {
      pending = true;
      return;
    }
    return runNow();
  };

  return schedule;
}

// ---- Penelitian (satu draft RAB per akun) ----
export async function getOrCreateMyPenelitian(session) {
  const ownerId = session.user.id;
  const { data: existing, error: selErr } = await supabase
    .from("penelitian")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data: created, error: insErr } = await supabase
    .from("penelitian")
    .insert({ owner_id: ownerId })
    .select()
    .single();
  if (insErr) throw insErr;
  return created;
}

export async function updatePenelitian(penelitianId, patch) {
  const { error } = await supabase.from("penelitian").update(patch).eq("id", penelitianId);
  if (error) throw error;
}

// ---- RAB items (delete+reinsert atomik lewat RPC save_rab_items) ----
export async function fetchRabItems(penelitianId) {
  const { data, error } = await supabase
    .from("rab_items")
    .select("*")
    .eq("penelitian_id", penelitianId)
    .order("tahun_ke", { ascending: true })
    .order("urutan", { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveRabItems(penelitianId, items) {
  const { error } = await supabase.rpc("save_rab_items", {
    p_penelitian_id: penelitianId,
    p_items: items,
  });
  if (error) throw error;
}

// Susun baris flat dari `rab_items` (satu baris = satu item, dengan tahun_ke
// & kategori) menjadi bentuk itemsByTahun[tahunIdx][kategoriId] = [...] yang
// sudah dipakai App secara internal — supaya App tidak perlu tahu bentuk
// tabel Postgres sama sekali. null kalau memang belum ada item tersimpan
// (penelitian baru), supaya App jatuh ke template default bawaannya sendiri.
// Setiap tahun SELALU diisi seluruh `categoryIds` (array kosong kalau memang
// tidak ada barisnya) — App mengasumsikan tiap kategori selalu ada sebagai
// array, bukan key yang kadang hilang.
export function groupRabItemsByYear(flatRows, jumlahTahun, categoryIds) {
  if (!flatRows || flatRows.length === 0) return null;
  const byYear = Array.from({ length: jumlahTahun }, () =>
    Object.fromEntries(categoryIds.map((id) => [id, []]))
  );
  for (const row of flatRows) {
    const yearIdx = (row.tahun_ke || 1) - 1;
    if (yearIdx < 0 || yearIdx >= byYear.length) continue;
    if (!byYear[yearIdx][row.kategori]) byYear[yearIdx][row.kategori] = [];
    byYear[yearIdx][row.kategori].push({
      id: row.id,
      label: row.label,
      vol: row.vol,
      sat: row.sat,
      vol2: row.vol2,
      sat2: row.sat2,
      harga: row.harga,
    });
  }
  return byYear;
}

// Kebalikan dari groupRabItemsByYear — meratakan itemsByTahun jadi array
// baris untuk dikirim ke RPC save_rab_items (delete+reinsert per penelitian).
export function flattenRabItemsForSave(itemsByTahun, categoryIds) {
  const out = [];
  itemsByTahun.forEach((yearItems, yearIdx) => {
    categoryIds.forEach((catId) => {
      (yearItems[catId] || []).forEach((it, idx) => {
        out.push({
          tahun_ke: yearIdx + 1,
          kategori: catId,
          label: it.label || "",
          vol: Number(it.vol) || 0,
          sat: it.sat || "",
          vol2: Number(it.vol2) || 1,
          sat2: it.sat2 || "-",
          harga: Number(it.harga) || 0,
          urutan: idx,
        });
      });
    });
  });
  return out;
}

// ---- Pencairan Dana ----
export async function listPencairan(penelitianId) {
  const { data, error } = await supabase
    .from("pencairan_dana")
    .select("*")
    .eq("penelitian_id", penelitianId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addPencairan(penelitianId, row) {
  const { data, error } = await supabase
    .from("pencairan_dana")
    .insert({ penelitian_id: penelitianId, ...row })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePencairan(id, patch) {
  const { error } = await supabase.from("pencairan_dana").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePencairan(id) {
  const { error } = await supabase.from("pencairan_dana").delete().eq("id", id);
  if (error) throw error;
}

// ---- Pengeluaran ----
export async function listPengeluaran(penelitianId) {
  const { data, error } = await supabase
    .from("pengeluaran")
    .select("*")
    .eq("penelitian_id", penelitianId)
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPengeluaran(penelitianId, row) {
  const { data, error } = await supabase
    .from("pengeluaran")
    .insert({ penelitian_id: penelitianId, ...row })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePengeluaran(id, patch) {
  const { error } = await supabase.from("pengeluaran").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePengeluaran(id) {
  const { error } = await supabase.from("pengeluaran").delete().eq("id", id);
  if (error) throw error;
}
