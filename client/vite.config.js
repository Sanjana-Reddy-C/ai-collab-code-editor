import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

// The dashboard pages are plain HTML + classic <script> files, which Vite
// does not bundle, so copy that folder into dist as-is after the build.
const copyDashboard = () => ({
  name: "copy-dashboard",
  closeBundle() {
    cpSync(resolve(root, "dashboard"), resolve(root, "dist/dashboard"), {
      recursive: true,
    });
  },
});

export default defineConfig({
  plugins: [react(), copyDashboard()],

  // Build both HTML pages (index + the page opened from the reset-email link)
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        reset: resolve(root, "reset-password.html"),
      },
    },
  },

  // Development: forward backend calls so relative URLs work on localhost too
  server: {
    port: 5173,
    // lets tunnel hostnames (trycloudflare, ngrok...) reach the dev server
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:3000",
      "/run-code": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/socket.io": { target: "http://localhost:3000", ws: true },
      "/yjs": {
        target: "ws://localhost:1234",
        ws: true,
        rewrite: (p) => p.replace(/^\/yjs/, ""),
      },
    },
  },
});