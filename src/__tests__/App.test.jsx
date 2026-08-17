import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import App, { CATEGORIES } from "../../rab-hibah.jsx";

const emptyItemsForYear = () => Object.fromEntries(CATEGORIES.map((c) => [c.id, []]));

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it("renders without crashing on a clean (first-visit) localStorage", () => {
    render(<App />);
    expect(screen.getByText("Sistem RAB Hibah")).toBeTruthy();
  });

  it("shows the account-storage privacy note", () => {
    render(<App />);
    expect(screen.getByText(/tersimpan di database akun Anda sendiri/)).toBeTruthy();
  });

  it("does not crash and falls back to defaults when the saved draft is corrupted JSON", () => {
    window.localStorage.setItem("rab-hibah-draft-v1", "{not valid json");
    render(<App />);
    expect(screen.getByText("Sistem RAB Hibah")).toBeTruthy();
  });

  it("shows the logged-in email and a logout button when userEmail/onLogout are provided", () => {
    const onLogout = vi.fn();
    render(<App userEmail="user@test.com" onLogout={onLogout} />);
    expect(screen.getByText("user@test.com")).toBeTruthy();
    expect(screen.getByText("Keluar")).toBeTruthy();
  });

  it("hydrates from initialRemote (account data) instead of the local draft", async () => {
    render(
      <App
        initialRemote={{
          skemaId: "bestari",
          jumlahTahun: 1,
          progStudi: "Sistem Informasi",
          namaKetua: "Dr. Contoh",
          paguKustom: false,
          itemsByTahun: [{
            ...emptyItemsForYear(),
            honor: [{ id: "r1", label: "Item dari akun", vol: 1, sat: "org", vol2: 1, sat2: "-", harga: 1000000 }],
          }],
        }}
      />
    );

    await waitFor(() => expect(screen.getByDisplayValue("Sistem Informasi")).toBeTruthy());
    expect(screen.getByDisplayValue("Dr. Contoh")).toBeTruthy();
  });

  it("calls onSync with the current state once hydrated, and skips calling it before hydration completes", async () => {
    const onSync = vi.fn();
    render(<App initialRemote={{ skemaId: "pfr", jumlahTahun: 1 }} onSync={onSync} />);

    await waitFor(() => expect(onSync).toHaveBeenCalled());
    const lastCallArg = onSync.mock.calls.at(-1)[0];
    expect(lastCallArg.skemaId).toBe("pfr");
  });
});
