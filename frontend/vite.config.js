import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Allow any localhost subdomains and custom domains
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward the original browser host so Django's TenantMiddleware can resolve the tenant
            if (req.headers.host) {
              proxyReq.setHeader('Host', req.headers.host);
              // Also send normalized domain header for maximum reliability
              const domain = req.headers.host.split(':')[0];
              proxyReq.setHeader('X-Tenant-Domain', domain);
            }
          });
        }
      }
    }
  }
})
