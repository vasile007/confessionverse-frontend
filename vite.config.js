
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  define: {
    global: 'globalThis'
  },
  // Dev proxy to Spring Boot to avoid CORS in development
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/v3': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      // Proxy SockJS/STOMP endpoints for dev WebSocket handshake
      '/ws': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
