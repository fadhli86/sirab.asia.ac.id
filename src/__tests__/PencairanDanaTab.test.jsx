import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const useSupabaseSessionMock = vi.fn(() => ({ penelitianId: "p1" }));
vi.mock("../lib/SupabaseSessionContext.jsx", () => ({
  useSupabaseSession: () => useSupabaseSessionMock(),
}));

const dbMock = {
  listPencairan: vi.fn(),
  addPencairan: vi.fn(),
  updatePencairan: vi.fn(),
  deletePencairan: vi.fn(),
  createDebouncedSaver: vi.fn((fn) => fn), // tanpa debounce nyata di test ini — sudah dites di db.test.js
};
vi.mock("../lib/db.js", () => dbMock);

const PencairanDanaTab = (await import("../PencairanDanaTab.jsx")).default;

describe("PencairanDanaTab", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useSupabaseSessionMock.mockReturnValue({ penelitianId: "p1" });
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
  });

  it("shows a prompt to log in when there is no active session (App rendered without AuthGate)", () => {
    useSupabaseSessionMock.mockReturnValue({ penelitianId: null });
    render(<PencairanDanaTab />);
    expect(screen.getByText(/Masuk ke akun Anda/)).toBeTruthy();
    expect(dbMock.listPencairan).not.toHaveBeenCalled();
  });

  it("shows a loading state, then renders fetched rows", async () => {
    dbMock.listPencairan.mockResolvedValue([
      { id: "d1", termin: "Dana Awal", persen: 80, nominal: 8000000, tanggal: "2026-01-10", status: "diterima", catatan: "" },
    ]);

    render(<PencairanDanaTab />);
    expect(screen.getByText(/Memuat data pencairan dana/)).toBeTruthy();

    expect(await screen.findByDisplayValue("Dana Awal")).toBeTruthy();
    expect(dbMock.listPencairan).toHaveBeenCalledWith("p1");
    expect(await screen.findByText(/Total Dana Diterima: Rp 8.000.000/)).toBeTruthy();
  });

  it("shows an error state when the fetch fails", async () => {
    dbMock.listPencairan.mockRejectedValue(new Error("offline"));
    render(<PencairanDanaTab />);
    expect(await screen.findByText(/Gagal memuat pencairan dana: offline/)).toBeTruthy();
  });

  it("clicking Coba lagi after an error re-fetches and can succeed", async () => {
    dbMock.listPencairan.mockRejectedValueOnce(new Error("offline"));
    render(<PencairanDanaTab />);
    await screen.findByText(/Gagal memuat pencairan dana: offline/);

    dbMock.listPencairan.mockResolvedValueOnce([
      { id: "d1", termin: "Dana Awal", persen: 80, nominal: 1000, tanggal: "", status: "menunggu", catatan: "" },
    ]);
    fireEvent.click(screen.getByText("Coba lagi"));

    expect(await screen.findByDisplayValue("Dana Awal")).toBeTruthy();
    expect(dbMock.listPencairan).toHaveBeenCalledTimes(2);
  });

  it("adding a row calls addPencairan and appends the created row", async () => {
    dbMock.listPencairan.mockResolvedValue([]);
    dbMock.addPencairan.mockResolvedValue({ id: "d2", termin: "Termin baru", nominal: 0, status: "menunggu", persen: null, tanggal: "", catatan: "" });

    render(<PencairanDanaTab />);
    await screen.findByText(/Belum ada catatan pencairan dana/);

    fireEvent.click(screen.getByText("+ Tambah Termin Pencairan"));

    expect(await screen.findByDisplayValue("Termin baru")).toBeTruthy();
    expect(dbMock.addPencairan).toHaveBeenCalledWith("p1", { termin: "Termin baru", nominal: 0, status: "menunggu" });
  });

  it("editing a field updates local state and calls updatePencairan with the patch", async () => {
    dbMock.listPencairan.mockResolvedValue([
      { id: "d1", termin: "Dana Awal", persen: 80, nominal: 1000, tanggal: "", status: "menunggu", catatan: "" },
    ]);

    render(<PencairanDanaTab />);
    const input = await screen.findByDisplayValue("Dana Awal");
    fireEvent.change(input, { target: { value: "Dana Tahap 1" } });

    expect(await screen.findByDisplayValue("Dana Tahap 1")).toBeTruthy();
    expect(dbMock.updatePencairan).toHaveBeenCalledWith("d1", { termin: "Dana Tahap 1" });
  });

  it("removing a row asks for confirmation and calls deletePencairan", async () => {
    dbMock.listPencairan.mockResolvedValue([
      { id: "d1", termin: "Dana Awal", persen: 80, nominal: 1000, tanggal: "", status: "menunggu", catatan: "" },
    ]);
    dbMock.deletePencairan.mockResolvedValue();

    render(<PencairanDanaTab />);
    await screen.findByDisplayValue("Dana Awal");
    fireEvent.click(screen.getByLabelText("Hapus pencairan Dana Awal"));

    expect(window.confirm).toHaveBeenCalled();
    expect(dbMock.deletePencairan).toHaveBeenCalledWith("d1");
    expect(await screen.findByText(/Belum ada catatan pencairan dana/)).toBeTruthy();
  });

  it("does not delete when the user cancels the confirmation", async () => {
    window.confirm = vi.fn(() => false);
    dbMock.listPencairan.mockResolvedValue([
      { id: "d1", termin: "Dana Awal", persen: 80, nominal: 1000, tanggal: "", status: "menunggu", catatan: "" },
    ]);

    render(<PencairanDanaTab />);
    await screen.findByDisplayValue("Dana Awal");
    fireEvent.click(screen.getByLabelText("Hapus pencairan Dana Awal"));

    expect(dbMock.deletePencairan).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Dana Awal")).toBeTruthy();
  });
});
