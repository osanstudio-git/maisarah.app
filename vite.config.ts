import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Maisarah App',
        short_name: 'Maisarah',
        description: 'Premium Financial and Accounting Solutions for Oman',
        theme_color: '#A11212',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 4000000,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === (typeof globalThis !== 'undefined' && 'location' in globalThis ? (globalThis as any).location.origin : ''),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'maisarah-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 86400 * 30, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // Offline Fallback configuration
        navigateFallback: '/offline.html',
      },
    }),
  ],
  optimizeDeps: {
    include: ['react-is'],
  },
});
