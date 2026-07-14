import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 5175, host: "127.0.0.1" },
  build: {
      rollupOptions: {
        output: {
          onlyExplicitManualChunks: true,
          manualChunks(id) {
          const moduleId = id.replace(/\\/g, "/");
          if (/\/node_modules\/d3-[^/]+\//.test(moduleId)) return "charts-d3";
          if (/\/node_modules\/(recharts|victory-vendor)\//.test(moduleId)) return "charts";
          if (/\/node_modules\/(react-hook-form|zod)\//.test(moduleId) || moduleId.includes("/node_modules/@hookform/resolvers/")) return "forms";
          return undefined;
        },
      },
    },
  },
});
