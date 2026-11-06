import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['magicblur-icon.svg', 'hero-frame.svg'],
      manifest: {
        name: 'MAGICBLUR — Private Video Toolkit',
        short_name: 'MAGICBLUR',
        description: 'Edit video privately in your browser. Your video never leaves your device.',
        theme_color: '#fcfbff',
        background_color: '#fcfbff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/magicblur-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{html,js,css,svg,png,woff2,webmanifest}'],
        globIgnores: ['**/ffmpeg-core-*.js'],
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/ffmpeg-core-[^/]+\.(?:js|wasm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'magicblur-ffmpeg-core',
              expiration: { maxEntries: 8, maxAgeSeconds: 31_536_000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
