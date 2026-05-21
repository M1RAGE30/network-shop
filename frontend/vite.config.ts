import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const apiProxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  envPrefix: "VITE_",
  optimizeDeps: {
    include: ["react-dadata"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: apiProxyTarget, changeOrigin: true },
      "/uploads": { target: apiProxyTarget, changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: (id) => {
          if (id.includes("react-router-dom")) return "router";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("lucide-react")) return "ui";
          if (id.includes("socket.io-client")) return "socket";
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
