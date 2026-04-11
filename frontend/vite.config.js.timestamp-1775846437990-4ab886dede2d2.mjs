// vite.config.js
import { defineConfig } from "file:///C:/Temp/project.zip/A%20Real%20time%20flood%20and%20landslide%20prediction/Flood_Guard_Pro/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Temp/project.zip/A%20Real%20time%20flood%20and%20landslide%20prediction/Flood_Guard_Pro/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Temp/project.zip/A%20Real%20time%20flood%20and%20landslide%20prediction/Flood_Guard_Pro/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pwa-192x192.svg"],
      manifest: {
        name: "Flood Guard Pro",
        short_name: "FloodGuard",
        description: "Real-time flood and landslide prediction across India",
        theme_color: "#00666c",
        background_color: "#f4f6ff",
        display: "standalone",
        start_url: "/home",
        scope: "/",
        orientation: "portrait",
        categories: ["weather", "utilities"],
        icons: [
          {
            src: "pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "pwa-192x192.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ],
        shortcuts: [
          {
            name: "Emergency SOS",
            short_name: "SOS",
            description: "Open emergency contacts",
            url: "/home?sos=1",
            icons: [{ src: "/pwa-192x192.svg", sizes: "96x96" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "gstatic-fonts-cache", expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/leaflet.*/i,
            handler: "CacheFirst",
            options: { cacheName: "leaflet-cache", expiration: { maxAgeSeconds: 60 * 60 * 24 * 30 } }
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", expiration: { maxAgeSeconds: 60 * 5 } }
          }
        ]
      }
    })
  ],
  server: {
    port: 3e3,
    proxy: {
      // Only proxy API calls and static assets to Flask backend
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true
      },
      "/static": {
        target: "http://localhost:5000",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "../backend/dist",
    emptyOutDir: true
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxUZW1wXFxcXHByb2plY3QuemlwXFxcXEEgUmVhbCB0aW1lIGZsb29kIGFuZCBsYW5kc2xpZGUgcHJlZGljdGlvblxcXFxGbG9vZF9HdWFyZF9Qcm9cXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFRlbXBcXFxccHJvamVjdC56aXBcXFxcQSBSZWFsIHRpbWUgZmxvb2QgYW5kIGxhbmRzbGlkZSBwcmVkaWN0aW9uXFxcXEZsb29kX0d1YXJkX1Byb1xcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVGVtcC9wcm9qZWN0LnppcC9BJTIwUmVhbCUyMHRpbWUlMjBmbG9vZCUyMGFuZCUyMGxhbmRzbGlkZSUyMHByZWRpY3Rpb24vRmxvb2RfR3VhcmRfUHJvL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICBpbmNsdWRlQXNzZXRzOiBbJ3B3YS0xOTJ4MTkyLnN2ZyddLFxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIG5hbWU6ICdGbG9vZCBHdWFyZCBQcm8nLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdGbG9vZEd1YXJkJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1JlYWwtdGltZSBmbG9vZCBhbmQgbGFuZHNsaWRlIHByZWRpY3Rpb24gYWNyb3NzIEluZGlhJyxcclxuICAgICAgICB0aGVtZV9jb2xvcjogJyMwMDY2NmMnLFxyXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZjRmNmZmJyxcclxuICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXHJcbiAgICAgICAgc3RhcnRfdXJsOiAnL2hvbWUnLFxyXG4gICAgICAgIHNjb3BlOiAnLycsXHJcbiAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXHJcbiAgICAgICAgY2F0ZWdvcmllczogWyd3ZWF0aGVyJywgJ3V0aWxpdGllcyddLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3B3YS0xOTJ4MTkyLnN2ZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9zdmcreG1sJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAncHdhLTE5MngxOTIuc3ZnJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgc2hvcnRjdXRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6ICdFbWVyZ2VuY3kgU09TJyxcclxuICAgICAgICAgICAgc2hvcnRfbmFtZTogJ1NPUycsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3BlbiBlbWVyZ2VuY3kgY29udGFjdHMnLFxyXG4gICAgICAgICAgICB1cmw6ICcvaG9tZT9zb3M9MScsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6ICcvcHdhLTE5MngxOTIuc3ZnJywgc2l6ZXM6ICc5Nng5NicgfV1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH0sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd29mZjJ9J10sXHJcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9mb250c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiAnZ29vZ2xlLWZvbnRzLWNhY2hlJywgZXhwaXJhdGlvbjogeyBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUgfSB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuZ3N0YXRpY1xcLmNvbVxcLy4qL2ksXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcclxuICAgICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6ICdnc3RhdGljLWZvbnRzLWNhY2hlJywgZXhwaXJhdGlvbjogeyBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUgfSB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL3VucGtnXFwuY29tXFwvbGVhZmxldC4qL2ksXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcclxuICAgICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6ICdsZWFmbGV0LWNhY2hlJywgZXhwaXJhdGlvbjogeyBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCB9IH1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eXFwvYXBpXFwvLiovaSxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXHJcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiAnYXBpLWNhY2hlJywgZXhwaXJhdGlvbjogeyBtYXhBZ2VTZWNvbmRzOiA2MCAqIDUgfSB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIF0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiAzMDAwLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgLy8gT25seSBwcm94eSBBUEkgY2FsbHMgYW5kIHN0YXRpYyBhc3NldHMgdG8gRmxhc2sgYmFja2VuZFxyXG4gICAgICAnL2FwaSc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICAnL3N0YXRpYyc6IHtcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUwMDAnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuICBidWlsZDoge1xyXG4gICAgb3V0RGlyOiAnLi4vYmFja2VuZC9kaXN0JyxcclxuICAgIGVtcHR5T3V0RGlyOiB0cnVlXHJcbiAgfVxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQStjLFNBQVMsb0JBQW9CO0FBQzVlLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFFeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZUFBZSxDQUFDLGlCQUFpQjtBQUFBLE1BQ2pDLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxRQUNQLGFBQWE7QUFBQSxRQUNiLFlBQVksQ0FBQyxXQUFXLFdBQVc7QUFBQSxRQUNuQyxPQUFPO0FBQUEsVUFDTDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsWUFDTixTQUFTO0FBQUEsVUFDWDtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFdBQVc7QUFBQSxVQUNUO0FBQUEsWUFDRSxNQUFNO0FBQUEsWUFDTixZQUFZO0FBQUEsWUFDWixhQUFhO0FBQUEsWUFDYixLQUFLO0FBQUEsWUFDTCxPQUFPLENBQUMsRUFBRSxLQUFLLG9CQUFvQixPQUFPLFFBQVEsQ0FBQztBQUFBLFVBQ3JEO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLGNBQWMsQ0FBQyxzQ0FBc0M7QUFBQSxRQUNyRCxnQkFBZ0I7QUFBQSxVQUNkO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTLEVBQUUsV0FBVyxzQkFBc0IsWUFBWSxFQUFFLGVBQWUsS0FBSyxLQUFLLEtBQUssSUFBSSxFQUFFO0FBQUEsVUFDaEc7QUFBQSxVQUNBO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTLEVBQUUsV0FBVyx1QkFBdUIsWUFBWSxFQUFFLGVBQWUsS0FBSyxLQUFLLEtBQUssSUFBSSxFQUFFO0FBQUEsVUFDakc7QUFBQSxVQUNBO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTLEVBQUUsV0FBVyxpQkFBaUIsWUFBWSxFQUFFLGVBQWUsS0FBSyxLQUFLLEtBQUssR0FBRyxFQUFFO0FBQUEsVUFDMUY7QUFBQSxVQUNBO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTLEVBQUUsV0FBVyxhQUFhLFlBQVksRUFBRSxlQUFlLEtBQUssRUFBRSxFQUFFO0FBQUEsVUFDM0U7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQTtBQUFBLE1BRUwsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2hCO0FBQUEsTUFDQSxXQUFXO0FBQUEsUUFDVCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLEVBQ2Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
