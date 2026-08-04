/// <reference types="vitest" />

import { defineConfig } from "vite";
import analog from "@analogjs/platform";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  optimizeDeps: {
    include: ["marked"],
  },
  build: {
    target: ["es2020"],
  },
  resolve: {
    mainFields: ["module"],
    alias: {
      "@app": path.resolve(__dirname, "./src/app"),
      "@server": path.resolve(__dirname, "./src/server"),
    },
  },
  plugins: [
    analog({
      ssr: false,
      nitro: {
        alias: {
          "@server": path.resolve(__dirname, "./src/server"),
        },
        errorHandler: "~/error-handler.ts",
        // 🔹 Evitar que Nitro levante procesos en segundo plano para prerenderizado
        prerender: {
          crawlLinks: false,
          routes: [],
        },
      },
    }),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    include: ["**/*.spec.ts"],
    reporters: ["default"],
  },
}));