import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

const authMock = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signOut: vi.fn(),
};
vi.mock("../lib/supabaseClient.js", () => ({ supabase: { auth: authMock } }));

const dbMock = {
  getOrCreateMyPenelitian: vi.fn(),
  fetchRabItems: vi.fn(),
  groupRabItemsByYear: vi.fn(() => null),
  flattenRabItemsForSave: vi.fn(() => []),
  updatePenelitian: vi.fn(),
  saveRabItems: vi.fn(),
  createDebouncedSaver: vi.fn((fn) => fn),
};
vi.mock("../lib/db.js", () => dbMock);

vi.mock("../../rab-hibah.jsx", () => ({
  default: ({ userEmail }) => <div>App dimuat untuk {userEmail}</div>,
  CATEGORIES: [{ id: "honor" }, { id: "bahan" }],
}));

const AuthGate = (await import("../AuthGate.jsx")).default;

describe("AuthGate", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    authMock.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it("shows the login form when there is no session", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });

    render(<AuthGate />);

    expect(await screen.findByText("Masuk ke akun Anda")).toBeTruthy();
  });

  it("loads penelitian data and renders App once a session exists", async () => {
    const session = { user: { id: "u1", email: "user@test.com" } };
    authMock.getSession.mockResolvedValue({ data: { session } });
    dbMock.getOrCreateMyPenelitian.mockResolvedValue({
      id: "p1", skema_id: "pfr", jumlah_tahun: 1, program_studi: "", nama_ketua: "",
      pagu_kustom: false, pagu_min_kustom: null, pagu_max_kustom: null,
    });
    dbMock.fetchRabItems.mockResolvedValue([]);

    render(<AuthGate />);

    expect(await screen.findByText("App dimuat untuk user@test.com")).toBeTruthy();
    expect(dbMock.getOrCreateMyPenelitian).toHaveBeenCalledWith(session);
    expect(dbMock.fetchRabItems).toHaveBeenCalledWith("p1");
  });

  it("shows an error state with retry if loading penelitian data fails", async () => {
    const session = { user: { id: "u1", email: "user@test.com" } };
    authMock.getSession.mockResolvedValue({ data: { session } });
    dbMock.getOrCreateMyPenelitian.mockRejectedValue(new Error("network down"));

    render(<AuthGate />);

    expect(await screen.findByText(/Gagal memuat data: network down/)).toBeTruthy();
  });

  it("shows a pending-confirmation message after signup when Supabase returns no session", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });
    authMock.signUp.mockResolvedValue({ data: { session: null }, error: null });

    render(<AuthGate />);
    await screen.findByText("Masuk ke akun Anda");

    fireEvent.click(screen.getByText("Belum punya akun? Daftar"));
    fireEvent.change(screen.getByLabelText("Nama Lengkap"), { target: { value: "Budi" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "budi@test.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByText("Daftar"));

    expect(await screen.findByText("Cek email Anda")).toBeTruthy();
    expect(authMock.signUp).toHaveBeenCalledWith({
      email: "budi@test.com",
      password: "secret123",
      options: { data: { nama_lengkap: "Budi" } },
    });
  });

  it("shows a form error message when login fails", async () => {
    authMock.getSession.mockResolvedValue({ data: { session: null } });
    authMock.signInWithPassword.mockResolvedValue({ error: new Error("Invalid login credentials") });

    render(<AuthGate />);
    await screen.findByText("Masuk ke akun Anda");

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "budi@test.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByText("Masuk"));

    expect(await screen.findByText("Invalid login credentials")).toBeTruthy();
  });
});
