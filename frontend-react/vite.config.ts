// Plain Vite SPA (converted from TanStack Start): the FastAPI backend
// serves the static build output (dist/) — there is no Node server.
// TanStack Router (file-based routes in src/routes) still generates
// src/routeTree.gen.ts via @tanstack/router-plugin.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  // Inline the demo images (cover/scene jpgs) as base64 into the JS
  // bundles, so dist/ is 100% text and can be committed to the repo
  // (the push tooling is text-only; binaries cannot be pushed).
  // The favicon stays a separate file (served by /favicon.ico, 204 if absent).
  build: { assetsInlineLimit: 1000000 },
});
