import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative base prevents GitHub Pages 404s under /repo-name/ paths.
  base: "./",
  plugins: [react(), tailwindcss()],
});
