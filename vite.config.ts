import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api/whatsapp": {
        target: "https://www.wasenderapi.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/whatsapp/, "/api/send-message"),
      },
    },
  },
});
