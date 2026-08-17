import { describe, it, expect, vi, beforeEach } from "vitest";

// Query builder tiruan: setiap method chain mengembalikan dirinya sendiri
// dan objeknya sendiri "thenable" (meniru perilaku supabase-js), resolve ke
// `response` yang bisa diganti per-test lewat `setResponse`.
function makeQueryBuilder() {
  let response = { data: null, error: null };
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(response)),
    single: vi.fn(() => Promise.resolve(response)),
    then: (resolve, reject) => Promise.resolve(response).then(resolve, reject),
    setResponse: (r) => {
      response = r;
    },
  };
  return builder;
}

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("../lib/supabaseClient.js", () => ({ supabase: mockSupabase }));

const {
  getOrCreateMyPenelitian,
  saveRabItems,
  listPencairan,
  addPencairan,
  addPengeluaran,
  createDebouncedSaver,
  groupRabItemsByYear,
  flattenRabItemsForSave,
} = await import("../lib/db.js");

describe("groupRabItemsByYear / flattenRabItemsForSave round-trip", () => {
  const CAT_IDS = ["honor", "bahan"];

  it("returns null when there are no rows (brand new penelitian)", () => {
    expect(groupRabItemsByYear([], 1, CAT_IDS)).toBeNull();
    expect(groupRabItemsByYear(null, 1, CAT_IDS)).toBeNull();
  });

  it("groups flat rows by year and category", () => {
    const rows = [
      { id: "r1", tahun_ke: 1, kategori: "honor", label: "Ketua", vol: 1, sat: "org", vol2: 8, sat2: "OB", harga: 1000 },
      { id: "r2", tahun_ke: 2, kategori: "bahan", label: "Reagen", vol: 1, sat: "paket", vol2: 1, sat2: "-", harga: 5000 },
    ];
    const grouped = groupRabItemsByYear(rows, 2, CAT_IDS);
    expect(grouped[0].honor).toEqual([{ id: "r1", label: "Ketua", vol: 1, sat: "org", vol2: 8, sat2: "OB", harga: 1000 }]);
    expect(grouped[1].bahan).toEqual([{ id: "r2", label: "Reagen", vol: 1, sat: "paket", vol2: 1, sat2: "-", harga: 5000 }]);
  });

  it("fills every category as an empty array even when a year has no rows for it", () => {
    const rows = [{ id: "r1", tahun_ke: 1, kategori: "honor", label: "Ketua", vol: 1, sat: "org", vol2: 1, sat2: "-", harga: 1000 }];
    const grouped = groupRabItemsByYear(rows, 1, CAT_IDS);
    // "bahan" has no saved rows for this year, but must still exist as [] —
    // the rest of the app (subtotal, CategoryBlock) assumes every category
    // key is always present, never missing.
    expect(grouped[0].bahan).toEqual([]);
  });

  it("ignores rows whose tahun_ke falls outside the current jumlahTahun", () => {
    const rows = [{ id: "r1", tahun_ke: 5, kategori: "honor", label: "x", vol: 1, sat: "-", vol2: 1, sat2: "-", harga: 0 }];
    const grouped = groupRabItemsByYear(rows, 1, CAT_IDS);
    expect(grouped[0]).toEqual({ honor: [], bahan: [] });
  });

  it("flattens itemsByTahun back into RPC-ready rows with urutan preserved", () => {
    const itemsByTahun = [
      {
        honor: [{ label: "Ketua", vol: 1, sat: "org", vol2: 8, sat2: "OB", harga: 1000 }],
        bahan: [],
      },
    ];
    const flat = flattenRabItemsForSave(itemsByTahun, CAT_IDS);
    expect(flat).toEqual([
      { tahun_ke: 1, kategori: "honor", label: "Ketua", vol: 1, sat: "org", vol2: 8, sat2: "OB", harga: 1000, urutan: 0 },
    ]);
  });

  it("round-trips group -> flatten without losing data", () => {
    const rows = [
      { id: "r1", tahun_ke: 1, kategori: "honor", label: "Ketua", vol: 1, sat: "org", vol2: 8, sat2: "OB", harga: 1000 },
      { id: "r2", tahun_ke: 1, kategori: "honor", label: "Anggota", vol: 2, sat: "org", vol2: 8, sat2: "OB", harga: 500 },
    ];
    const grouped = groupRabItemsByYear(rows, 1, CAT_IDS);
    const flat = flattenRabItemsForSave(grouped, CAT_IDS);
    expect(flat.map((r) => r.label)).toEqual(["Ketua", "Anggota"]);
    expect(flat.map((r) => r.urutan)).toEqual([0, 1]);
  });
});

describe("getOrCreateMyPenelitian", () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
  });

  it("returns the existing row without inserting when one is found", async () => {
    const existingRow = { id: "p1", owner_id: "u1" };
    const builder = makeQueryBuilder();
    builder.setResponse({ data: existingRow, error: null });
    mockSupabase.from.mockReturnValue(builder);

    const result = await getOrCreateMyPenelitian({ user: { id: "u1" } });

    expect(result).toBe(existingRow);
    expect(builder.insert).not.toHaveBeenCalled();
  });

  it("creates a new row when none exists yet", async () => {
    const selectBuilder = makeQueryBuilder();
    selectBuilder.setResponse({ data: null, error: null });
    const insertBuilder = makeQueryBuilder();
    const createdRow = { id: "p2", owner_id: "u2" };
    insertBuilder.setResponse({ data: createdRow, error: null });

    mockSupabase.from.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(insertBuilder);

    const result = await getOrCreateMyPenelitian({ user: { id: "u2" } });

    expect(result).toBe(createdRow);
    expect(insertBuilder.insert).toHaveBeenCalledWith({ owner_id: "u2" });
  });

  it("throws when the select fails", async () => {
    const builder = makeQueryBuilder();
    builder.setResponse({ data: null, error: new Error("boom") });
    mockSupabase.from.mockReturnValue(builder);

    await expect(getOrCreateMyPenelitian({ user: { id: "u3" } })).rejects.toThrow("boom");
  });
});

describe("saveRabItems", () => {
  it("calls the save_rab_items RPC with the penelitian id and items", async () => {
    mockSupabase.rpc.mockReset();
    mockSupabase.rpc.mockResolvedValue({ error: null });
    const items = [{ tahun_ke: 1, kategori: "honor", label: "x", vol: 1, sat: "org", vol2: 1, sat2: "-", harga: 1000, urutan: 0 }];

    await saveRabItems("p1", items);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("save_rab_items", { p_penelitian_id: "p1", p_items: items });
  });

  it("throws when the RPC returns an error", async () => {
    mockSupabase.rpc.mockReset();
    mockSupabase.rpc.mockResolvedValue({ error: new Error("rpc failed") });
    await expect(saveRabItems("p1", [])).rejects.toThrow("rpc failed");
  });
});

describe("pencairan/pengeluaran CRUD helpers", () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
  });

  it("listPencairan queries by penelitian_id ordered by created_at", async () => {
    const rows = [{ id: "d1" }];
    const builder = makeQueryBuilder();
    builder.setResponse({ data: rows, error: null });
    mockSupabase.from.mockReturnValue(builder);

    const result = await listPencairan("p1");

    expect(mockSupabase.from).toHaveBeenCalledWith("pencairan_dana");
    expect(builder.eq).toHaveBeenCalledWith("penelitian_id", "p1");
    expect(result).toBe(rows);
  });

  it("addPencairan inserts with the penelitian_id merged in", async () => {
    const created = { id: "d2" };
    const builder = makeQueryBuilder();
    builder.setResponse({ data: created, error: null });
    mockSupabase.from.mockReturnValue(builder);

    const result = await addPencairan("p1", { termin: "Dana Awal", nominal: 1000 });

    expect(builder.insert).toHaveBeenCalledWith({ penelitian_id: "p1", termin: "Dana Awal", nominal: 1000 });
    expect(result).toBe(created);
  });

  it("addPengeluaran inserts with the penelitian_id merged in", async () => {
    const created = { id: "e1" };
    const builder = makeQueryBuilder();
    builder.setResponse({ data: created, error: null });
    mockSupabase.from.mockReturnValue(builder);

    const result = await addPengeluaran("p1", { kategori: "bahan", uraian: "x", nominal: 5000 });

    expect(builder.insert).toHaveBeenCalledWith({ penelitian_id: "p1", kategori: "bahan", uraian: "x", nominal: 5000 });
    expect(result).toBe(created);
  });
});

describe("createDebouncedSaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("coalesces rapid calls into a single invocation with the latest args", async () => {
    const fn = vi.fn().mockResolvedValue();
    const saver = createDebouncedSaver(fn, 100);

    saver("a");
    saver("b");
    saver("c");
    expect(fn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
  });

  it("re-runs with newer args if a call arrives while a save is in flight", async () => {
    let resolveFirst;
    const fn = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockImplementationOnce(() => Promise.resolve());
    const saver = createDebouncedSaver(fn, 100);

    saver("first");
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(1);

    // A second edit arrives while the first save is still in flight.
    saver("second");
    await vi.advanceTimersByTimeAsync(100);
    // Still just the first call in flight — the second is queued, not fired yet.
    expect(fn).toHaveBeenCalledTimes(1);

    resolveFirst();
    await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
    expect(fn).toHaveBeenLastCalledWith("second");
  });

  it("flush() runs immediately without waiting for the delay", async () => {
    const fn = vi.fn().mockResolvedValue();
    const saver = createDebouncedSaver(fn, 5000);

    saver("x");
    await saver.flush();

    expect(fn).toHaveBeenCalledWith("x");
  });
});
