import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const sharedProxy = {
  "/api/ef2": {
    target: "https://master.ef2.do/api2",
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/api\/ef2/, ""),
    configure: (proxy: any) => {
      proxy.on("proxyReq", (proxyReq: any, req: any) => {
        const ef2Token = req.headers?.["x-ef2-token"];
        if (ef2Token) {
          proxyReq.setHeader("Authorization", `Bearer ${ef2Token}`);
        } else if (req.headers?.authorization) {
          proxyReq.setHeader("Authorization", req.headers.authorization);
        }
      });
      proxy.on("proxyRes", (proxyRes: any) => {
        // EF2 envía "Access-Control-Allow-Origin: *,*" duplicado; lo normalizamos a "*"
        if (proxyRes.headers["access-control-allow-origin"]) {
          proxyRes.headers["access-control-allow-origin"] = "*";
        }
      });
    },
  },
  "/api/whatsapp": {
    target: "https://wasenderapi.com",
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/api\/whatsapp/, "/api/send-message"),
    configure: (proxy: any) => {
      proxy.on("proxyReq", (proxyReq: any, req: any) => {
        if (req.headers?.authorization) {
          proxyReq.setHeader("Authorization", req.headers.authorization);
        }
      });
    },
  },
};

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
    proxy: sharedProxy,
  },
  preview: {
    port: 3000,
    proxy: sharedProxy,
  },
});
