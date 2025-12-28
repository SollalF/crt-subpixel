import { defineConfig } from "vite";
import typegpu from "unplugin-typegpu/vite";

export default defineConfig({
  plugins: [typegpu({})],
  server: {
    port: 8000,
    host: "0.0.0.0",
    cors: true,
  },
  build: {
    // For library builds, we still use tsc
    // This config is mainly for dev server
    outDir: "dist-vite",
    sourcemap: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["typegpu", "typed-binary", "tinyest"],
  },
});
