import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const useSupabaseSessionMock = vi.fn(() => ({ penelitianId: "p1" }));
vi.mock("../lib/SupabaseSessionContext.jsx", () => ({
  useSupabaseSession: () => useSupabaseSessionMock(),
}));

const dbMock = {
  listPencairan: vi.fn(),
  listPengeluaran: vi.fn(),
};
vi.mock("../lib/db.js", () => dbMock);

const DashboardRealisasi = (await import("../DashboardRealisasi.jsx")).default;

const CATEGORIES = [
  { id: "honor", title: "1. Honorarium" },
  { id: "bahan", title: "2. Belanja Bahan Penelitian" },
];
const CATEGORY_META = {
  honor: { icon: "👥", color: "#1B5E4F" },
  bahan: { icon: "🧪", color: "#3D7A63" },
};

function renderDashboard(props = {}) {
  return render(
    <DashboardRealisasi
      subtotal={{ honor: 1000000, bahan: 500000 }}
      totalKeseluruhan={1500000}
      categories={CATEGORIES}
      categoryMeta={CATEGORY_META}
      {...props}
    />
  );
}

describe("DashboardRealisasi", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    useSupabaseSessionMock.mockReturnValue({ penelitianId: "p1" });
  });

  it("renders nothing when there is no active session (App rendered without AuthGate)", () => {
    useSupabaseSessionMock.mockReturnValue({ penelitianId: null });
    const { container } = renderDashboard();
    expect(container.textContent).toBe("");
    expect(dbMock.listPencairan).not.toHaveBeenCalled();
  });

  it("shows a loading state before data arrives", () => {
    dbMock.listPencairan.mockReturnValue(new Promise(() => {}));
    dbMock.listPengeluaran.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText(/Memuat data realisasi/)).toBeTruthy();
  });

  it("shows an error state when fetching fails", async () => {
    dbMock.listPencairan.mockRejectedValue(new Error("db down"));
    dbMock.listPengeluaran.mockResolvedValue([]);
    renderDashboard();
    expect(await screen.findByText(/Gagal memuat realisasi: db down/)).toBeTruthy();
  });

  it("computes Dana Diterima only from tranches marked diterima, Realisasi from all pengeluaran, and Sisa Kas = Dana Diterima - Realisasi", async () => {
    dbMock.listPencairan.mockResolvedValue([
      { id: "d1", status: "diterima", nominal: 1000000 },
      { id: "d2", status: "menunggu", nominal: 500000 }, // belum cair — tidak ikut dihitung
    ]);
    dbMock.listPengeluaran.mockResolvedValue([
      { id: "e1", kategori: "honor", nominal: 250000 },
      { id: "e2", kategori: "bahan", nominal: 150000 },
    ]);

    // subtotal (rencana RAB) sengaja pakai angka yang tidak bentrok dengan
    // Dana Diterima/Realisasi/Sisa Kas di bawah, supaya assertion getByText
    // (exact match) tidak menabrak nilai lain yang dirender di bar chart.
    renderDashboard({ subtotal: { honor: 9000000, bahan: 8000000 } });

    expect(await screen.findByText("Rp 1.000.000")).toBeTruthy(); // Dana Diterima
    expect(screen.getByText("Rp 400.000")).toBeTruthy(); // Realisasi (250k + 150k)
    expect(screen.getByText("Rp 600.000")).toBeTruthy(); // Sisa Kas = 1.000.000 - 400.000
  });

  it("shows a negative Sisa Kas in red when realisasi exceeds dana diterima", async () => {
    dbMock.listPencairan.mockResolvedValue([{ id: "d1", status: "diterima", nominal: 100000 }]);
    dbMock.listPengeluaran.mockResolvedValue([{ id: "e1", kategori: "honor", nominal: 400000 }]);

    renderDashboard();

    // rupiah() formats negative numbers via Math.round + toLocaleString, e.g. "Rp -300.000"
    expect(await screen.findByText(/Rp -300\.000/)).toBeTruthy();
  });
});
