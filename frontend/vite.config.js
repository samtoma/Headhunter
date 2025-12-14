import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'headhunter.samueltoma.io',
      'localhost',
      '127.0.0.1',
      'frontend-e2e',
      '.localhost'  // Allow all subdomains
    ],
    proxy: {
      '/api': {
        // Use VITE_API_URL for E2E environment, otherwise default to 'backend'
        // Use VITE_API_URL for E2E environment if it's a full URL, otherwise default to 'backend' service
        target: (process.env.VITE_API_URL && process.env.VITE_API_URL.startsWith('http'))
          ? process.env.VITE_API_URL
          : 'http://backend:30001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  // --- NEW TEST CONFIGURATION ---
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  }
})