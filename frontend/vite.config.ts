import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const apiProxyTarget = process.env.E2E_API_PROXY ?? "http://localhost:4000";

const HTML_ENTRIES: Record<string, string> = {
  main: path.resolve(__dirname, "index.html"),
  developer: path.resolve(__dirname, "developer.html"),
};

const SUPERADMIN_APP_HTML = path.resolve(__dirname, "superadmin-app.html");

/** Evita que /superadmin vire superadmin.html (redirect legado) em vez do index da SPA. */
function spaRouteFallbackPlugin() {
  const useSpaIndex = (req: { url?: string }, _res: unknown, next: () => void) => {
    const pathname = req.url?.split("?")[0] ?? "";
    const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(pathname);
    if (
      pathname &&
      pathname !== "/" &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/assets/") &&
      !hasFileExtension
    ) {
      const query = req.url?.includes("?") ? `?${req.url.split("?")[1]}` : "";
      req.url = `/index.html${query}`;
    }
    next();
  };

  return {
    name: "spa-route-fallback",
    configureServer(server: { middlewares: { use: (fn: typeof useSpaIndex) => void } }) {
      server.middlewares.use(useSpaIndex);
    },
    configurePreviewServer(server: { middlewares: { use: (fn: typeof useSpaIndex) => void } }) {
      server.middlewares.use(useSpaIndex);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    spaRouteFallbackPlugin(),
    ...(mode === "client" || mode === "development" || mode === "production"
      ? [
          VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["images/logo/logo-icon.svg", "images/logo/logo-wordmark.svg"],
            manifest: {
              name: "Fecho",
              short_name: "Fecho",
              description: "Concilie notas, extratos e recebimentos sem planilha.",
              theme_color: "#0b3d4c",
              background_color: "#ffffff",
              display: "standalone",
              start_url: "/",
              lang: "pt-BR",
              icons: [
                {
                  src: "/images/logo/logo-icon.svg",
                  sizes: "any",
                  type: "image/svg+xml",
                  purpose: "any maskable",
                },
              ],
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,ico,svg,png,woff2}"],
              importScripts: ["push-sw.js"],
              navigateFallbackDenylist: [/^\/api/],
            },
            devOptions: { enabled: false },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: true,
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input:
        mode === "superadmin"
          ? { superadmin: SUPERADMIN_APP_HTML }
          : mode === "developer"
            ? { developer: HTML_ENTRIES.developer }
            : HTML_ENTRIES,
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          motion: ["framer-motion"],
        },
      },
    },
  },
}));
