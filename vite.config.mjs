import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: false,
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  build: {
    outDir: "public",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("recharts")) {
            return "recharts";
          }

          if (id.includes("react-day-picker") || id.includes("@radix-ui/react-popover")) {
            return "calendar";
          }

          if (id.includes("@radix-ui")) {
            return "radix";
          }
        },
      },
    },
  },
});
