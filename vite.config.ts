import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'images/app-logo.png',
      ],
      manifest: {
        id: '/',
        name: 'Salah Companion',
        short_name: 'Salah',
        description: 'Islamic Prayer Times, Daily Hadith, Quran, and Accurate Qibla Compass',
        theme_color: '#064E3B',
        background_color: '#064E3B',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'window-controls-overlay'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['lifestyle', 'utilities', 'education', 'productivity'],
        prefer_related_applications: false,
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Salah Times',
            short_name: 'Salah',
            description: "View today's prayer schedule and tracking",
            url: '/app?tab=salah',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Qibla Compass',
            short_name: 'Qibla',
            description: 'Find Kaaba direction',
            url: '/app?action=qibla',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Daily Hadith',
            short_name: 'Hadith',
            description: 'Read authentic Hadith reflections',
            url: '/app?tab=hadith',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        importScripts: ['/push-handler.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\/.*/, /^\/\.well-known\/.*/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,woff,woff2}'],
        // Exclude large PDF files from service worker precaching
        globIgnores: ['**/*.pdf', '**/Quran*'],
        runtimeCaching: [
          {
            // Google Fonts Stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts Webfonts
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // External Hadith CDN
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/fawazahmed0\/hadith-api@1\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hadith-api-cdn',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Do NOT aggressively cache authenticated API endpoints
            urlPattern: /\/api\/(auth|prayers\/log|progress|notifications).*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'https://salah-companion-z3i4.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
