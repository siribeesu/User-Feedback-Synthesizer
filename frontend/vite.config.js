import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/health': 'http://localhost:8000',
      '/banks': 'http://localhost:8000',
      '/themes': 'http://localhost:8000',
      '/search': 'http://localhost:8000',
      '/digest': 'http://localhost:8000',
      '/ingest': 'http://localhost:8000',
      '/synthesize': 'http://localhost:8000',
    }
  }
})
