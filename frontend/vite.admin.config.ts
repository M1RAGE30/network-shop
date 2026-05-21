import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

function adminSpaFallback() {
  return {
    name: "admin-spa-fallback",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method !== "GET") return next();
        if (
          path.startsWith("/api") ||
          path.startsWith("/uploads") ||
          path.startsWith("/@") ||
          path.startsWith("/node_modules") ||
          path.startsWith("/src/") ||
          path.includes(".")
        ) {
          return next();
        }
        req.url = "/admin.html";
        next();
      });
    },
  };
}

const apiProxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:3000";

export default defineConfig({
  plugins: [react(), adminSpaFallback()],
  define: {
    "import.meta.env.VITE_APP_TARGET": JSON.stringify("admin"),
    "import.meta.env.VITE_SHOP_URL": JSON.stringify("http://localhost:5173"),
    "import.meta.env.VITE_ADMIN_URL": JSON.stringify("http://localhost:5174"),
  },
  envPrefix: "VITE_",
  server: {
    port: 5174,
    strictPort: true,
    open: "/admin.html",
    proxy: {
      "/api": { target: apiProxyTarget, changeOrigin: true },
      "/uploads": { target: apiProxyTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist-admin",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        admin: resolve(__dirname, "admin.html"),
      },
    },
  },
});
