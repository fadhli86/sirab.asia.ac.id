import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import App from "../../rab-hibah.jsx";

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it("renders without crashing on a clean (first-visit) localStorage", () => {
    render(<App />);
    expect(screen.getByText("Sistem RAB Hibah")).toBeTruthy();
  });

  it("shows the local-storage-only privacy note", () => {
    render(<App />);
    expect(screen.getByText(/hanya disimpan di peramban/)).toBeTruthy();
  });

  it("does not crash and falls back to defaults when the saved draft is corrupted JSON", () => {
    window.localStorage.setItem("rab-hibah-draft-v1", "{not valid json");
    render(<App />);
    expect(screen.getByText("Sistem RAB Hibah")).toBeTruthy();
  });
});
