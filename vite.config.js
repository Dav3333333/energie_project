import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null, // enregistrement manuel via registerSW.js
      strategies: 'generateSW',
      srcDir: 'src',
      filename: 'sw.js',
      devOptions: {
        enabled: false, // activer ponctuellement pour tester le SW en dev
        type: 'module',
        navigateFallback: 'index.html',
      },
      includeAssets: [
        'favicon.svg',
        'icons/apple-touch-icon.png',
        'robots.txt',
      ],
      manifest: {
        name: 'Galerie Énergie Manager',
        short_name: 'GEM',
        description:
          "Gestion manuelle de la distribution, du suivi et de la facturation d'électricité dans les galeries commerciales.",
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Nouveau relevé',
            short_name: 'Relevé',
            url: '/readings/new',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Nouvel achat kWh',
            short_name: 'Achat',
            url: '/energy-purchases/new',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/__\/.*/, // Firebase Auth handler
          /^\/api\/.*/, // futur backend custom
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: false, // prompt-based update
        skipWaiting: false,
        runtimeCaching: [
          // --- Google Fonts ---
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // --- Firebase Storage : images reçus, PDF ---
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'firebase-storage',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // --- Firebase Auth / Firestore / Functions : ne pas router via le SW.
          // Ces endpoints ne doivent jamais être mis en cache. On les laisse simplement
          // sans route (plutôt que 'NetworkOnly') pour qu'ils passent la requête au
          // navigateur sans jamais transiter par le fetch handler du Service Worker :
          // le canal streaming/long-polling de Firestore (Listen) ne survit pas à un
          // passage par les stratégies Workbox (réponse bufferisée), ce qui provoque
          // l'erreur "A ServiceWorker intercepted the request and encountered an
          // unexpected error".
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, open: false, host: true },
  preview: { port: 4173, host: true },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
          ],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
});