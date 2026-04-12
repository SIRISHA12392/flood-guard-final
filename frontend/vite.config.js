import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Flood Guard Pro',
        short_name: 'FloodGuard',
        description: 'Real-time flood and landslide prediction across India',
        theme_color: '#00666c',
        background_color: '#f4f6ff',
        display: 'standalone',
        start_url: '/home',
        scope: '/',
        orientation: 'portrait',
        categories: ['weather', 'utilities'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Emergency SOS',
            short_name: 'SOS',
            description: 'Open emergency contacts',
            url: '/home?sos=1',
            icons: [{ src: '/pwa-192x192.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/leaflet.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'leaflet-cache', expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 } }
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 60 * 5 } }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      // Only proxy API calls and static assets to Flask backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/static': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
