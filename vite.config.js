import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";
import mix$ from 'vite-plugin-mix'

const mix = mix$.default ?? mix$

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["@aleohq/wasm"],
  },
  plugins: [
    react(),
    mix({
      handler: './src/api.js',
    })
  ],
  server: {
    // Needed if you are linking local packages for development
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), "../sdk"],
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
