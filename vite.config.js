import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/sirab.asia.ac.id/",
  server: {
    open: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
