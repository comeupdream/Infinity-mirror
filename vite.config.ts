import { defineConfig } from "vite";

// Multi-page: the lamp (home), the blueprint lab, and the store each get their
// own entry so deep links work on static hosting (see render.yaml rewrites).
export default defineConfig({
  server: { open: true },
  build: {
    target: "es2020",
    outDir: "dist",
    rollupOptions: {
      input: {
        home: "index.html",
        lab: "lab.html",
        store: "store.html",
      },
    },
  },
});
