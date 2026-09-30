import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/cdns-pkg-ui/',
  build: { outDir: 'dist/public' },
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['local.priceline.com'],
    proxy: {
      // Global header assets — served from qaa.priceline.com in QAA
      '/global-web-components': {
        target: 'https://qaa.priceline.com',
        changeOrigin: true,
        secure: false,
      },
      '/cdns-pkg-ui/api': {
        target: 'http://localhost:3001',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/cdns-pkg-ui/, ''),
      },
      '/cdns-pkg-ui/debug/raw': {
        target: 'http://localhost:3001',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/cdns-pkg-ui/, ''),
      },
      '/cdns-pkg-ui/debug/raw-flights': {
        target: 'http://localhost:3001',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/cdns-pkg-ui/, ''),
      },
      '/cdns-pkg-ui/api/flights': {
        target: 'http://localhost:3001',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/cdns-pkg-ui/, ''),
      },
    },
  },
})
