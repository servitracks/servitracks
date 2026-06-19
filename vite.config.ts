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
  build: {
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 3000,
    proxy: {
      "/api/dgii": {
        target: "https://dgii-rnc.pronesoft.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/dgii/, "/get"),
      },
      "/api/whatsapp": {
        target: "https://wasenderapi.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/whatsapp/, "/api/send-message"),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Asegurarse de que Authorization header pasa correctamente
            if ((req as any).headers?.authorization) {
              proxyReq.setHeader('Authorization', (req as any).headers.authorization);
            }
          });
        },
      },
    },
  },
});
