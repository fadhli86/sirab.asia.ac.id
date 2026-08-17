import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Sementara dilayani di subpath bawaan GitHub Pages
  // (fadhli86.github.io/sirab.asia.ac.id/), bukan domain kustom root —
  // ganti balik ke "/" begitu domain sirab.asia.ac.id sudah aktif.
  base: "/sirab.asia.ac.id/",
  plugins: [react()],
  server: {
    open: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
