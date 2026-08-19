import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Spring Boot backend (fargo-sdk-example) runs on port 8081 by default
// (see src/main/resources/application.properties in that project).
// This proxy lets the dashboard call relative /fargo-sdk-example/* paths
// during development without hitting CORS issues.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/fargo-sdk-example": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/users": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/flows": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/public": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
});
