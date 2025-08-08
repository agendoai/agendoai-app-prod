import { fileURLToPath } from "url";
import path, { dirname } from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const target = env.VITE_API_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@shared": path.resolve(__dirname, "../shared"),
        "@assets": path.resolve(__dirname, "../attached_assets"),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        }
      }
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});