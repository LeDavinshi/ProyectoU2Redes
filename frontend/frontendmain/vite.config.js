
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { 
    port: 5173,
    headers: {
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:3000 http://localhost:3001 http://localhost:3002 http://localhost:4000 ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
    },
    proxy: {
      '/api/auth': {
        target: 'http://auth-service:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, '')
      },
      '/api/core': {
        target: 'http://core-service:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/core/, '')
      },
      '/api/docs': {
        target: 'http://documentacion-service:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/docs/, '')
      },
      '/login': {
        target: 'http://auth-service:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          vendor: ['axios', 'jwt-decode']
        }
      }
    },
    // Generate source maps for better debugging
    sourcemap: true,
    // Use esbuild for minification (default in Vite)
    minify: 'esbuild',
    // Target modern browsers
    target: 'esnext',
    // Don't clear the screen during build
    clearScreen: false
  },
  // Add CSP meta tag for production
  define: {
    'import.meta.env.VITE_CSP_HEADER': JSON.stringify(
      "default-src 'self'; " +
      "connect-src 'self' http://localhost:3000 http://localhost:4200 http://localhost:3002 http://localhost:4000 ws://localhost:*; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; " +
      "font-src 'self' data:;"
    )
  }
})
