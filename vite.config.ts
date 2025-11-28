import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supaUrl = env.VITE_SUPABASE_URL || "";
  const proxy = (() => {
    // Dev convenience: proxy /api/public-reviews to Supabase Functions
    try {
      const u = new URL(supaUrl);
      const functionsOrigin = u.origin.replace(
        ".supabase.co",
        ".functions.supabase.co"
      );
      return {
        "/api/public-reviews": {
          target: `${functionsOrigin}`,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/public-reviews/, "/public-reviews"),
        },
      };
    } catch {
      return {};
    }
  })();

  return ({
  base: "/",
  server: {
    host: "::",
    port: 8080,
    proxy,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          // Remove React from manual chunking to prevent null reference issues
          'vendor-charts': ['recharts'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          'vendor-query': ['@tanstack/react-query'],
        }
      }
    }
  }
  });
});
