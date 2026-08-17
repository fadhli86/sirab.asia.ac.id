import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const useSupabaseSessionMock = vi.fn(() => ({ penelitianId: "p1" }));
vi.mock("../lib/SupabaseSessionContext.jsx", () => ({
  useSupabaseSession: () => useSupabaseSessionMock(),
}));

const dbMock = {
  listPengeluaran: vi.fn(),
  addPengeluaran: vi.fn(),
  updatePengeluaran: vi.fn(),
  deletePengeluaran: vi.fn(),
  createDebouncedSaver: vi.fn((fn) => fn),
};
vi.mock("../lib/db.js", () => dbMock);

const CATEGORIES = [
  { id: "honor", title: "1. Honorarium" },
  { id: "bahan", title: "2. Belanja Bahan Penelitian" },
];

const PengeluaranTabInner = (await import("../PengeluaranTab.jsx")).default;
const PengeluaranTab = () => <PengeluaranTabInner categories={CATEGORIES} />;

describe("PengeluaranTab", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useSupabaseSessionMock.mockReturnValue({ penelitianId: "p1" });
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
  });

  it("shows a prompt to log in when there is no active session (App rendered without AuthGate)", () => {
    useSupabaseSessionMock.mockReturnValue({ penelitianId: null });
    render(<PengeluaranTab />);
    expect(screen.getByText(/Masuk ke akun Anda/)).toBeTruthy();
    expect(dbMock.listPengeluaran).not.toHaveBeenCalled();
  });

  it("shows a loading state, then renders fetched rows and the total", async () => {
    dbMock.listPengeluaran.mockResolvedValue([
      { id: "e1", kategori: "bahan", uraian: "Reagen kimia", nominal: 500000, tanggal: "2026-02-01", catatan: "" },
    ]);

    render(<PengeluaranTab />);
    expect(screen.getByText(/Memuat data pengeluaran/)).toBeTruthy();

    expect(await screen.findByDisplayValue("Reagen kimia")).toBeTruthy();
    expect(dbMock.listPengeluaran).toHaveBeenCalledWith("p1");
    expect(await screen.findByText(/Total Pengeluaran: Rp 500.000/)).toBeTruthy();
  });

  it("shows an error state when the fetch fails", async () => {
    dbMock.listPengeluaran.mockRejectedValue(new Error("offline"));
    render(<PengeluaranTab />);
    expect(await screen.findByText(/Gagal memuat pengeluaran: offline/)).toBeTruthy();
  });

  it("adding a row calls addPengeluaran with the first category as default", async () => {
    dbMock.listPengeluaran.mockResolvedValue([]);
    dbMock.addPengeluaran.mockResolvedValue({ id: "e2", kategori: "honor", uraian: "", nominal: 0, tanggal: "", catatan: "" });

    render(<PengeluaranTab />);
    await screen.findByText(/Belum ada catatan pengeluaran/);

    fireEvent.click(screen.getByText("+ Tambah Pengeluaran"));

    await screen.findByLabelText("Uraian");
    expect(dbMock.addPengeluaran).toHaveBeenCalledWith("p1", { kategori: "honor", uraian: "", nominal: 0 });
  });

  it("editing the nominal field updates state and calls updatePengeluaran", async () => {
    dbMock.listPengeluaran.mockResolvedValue([
      { id: "e1", kategori: "bahan", uraian: "Reagen", nominal: 1000, tanggal: "", catatan: "" },
    ]);

    render(<PengeluaranTab />);
    await screen.findByDisplayValue("Reagen");
    fireEvent.change(screen.getByLabelText("Nominal"), { target: { value: "2500" } });

    expect(dbMock.updatePengeluaran).toHaveBeenCalledWith("e1", { nominal: 2500 });
    expect(await screen.findByText(/Total Pengeluaran: Rp 2.500/)).toBeTruthy();
  });

  it("removing a row asks for confirmation and calls deletePengeluaran", async () => {
    dbMock.listPengeluaran.mockResolvedValue([
      { id: "e1", kategori: "bahan", uraian: "Reagen", nominal: 1000, tanggal: "", catatan: "" },
    ]);
    dbMock.deletePengeluaran.mockResolvedValue();

    render(<PengeluaranTab />);
    await screen.findByDisplayValue("Reagen");
    fireEvent.click(screen.getByLabelText("Hapus pengeluaran Reagen"));

    expect(window.confirm).toHaveBeenCalled();
    expect(dbMock.deletePengeluaran).toHaveBeenCalledWith("e1");
    expect(await screen.findByText(/Belum ada catatan pengeluaran/)).toBeTruthy();
  });
});
