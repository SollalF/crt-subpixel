import { defineConfig } from "vite";
import typegpu from "unplugin-typegpu/vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    typegpu({}),
    dts({
      include: ["src"],
      outDir: "dist",
      rollupTypes: false,
    }),
  ],
  server: {
    port: 8000,
    host: "0.0.0.0",
    cors: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: ["typegpu", /^typegpu\/.*/, "typed-binary", "tinyest"],
      output: {
        // Preserve module structure for tree-shaking
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
  // Optimize dependencies for dev server
  optimizeDeps: {
    include: ["typegpu", "typed-binary", "tinyest"],
  },
});
