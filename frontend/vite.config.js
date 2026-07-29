import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:5000/api'
  // Build a regex that matches the API origin (strips /api suffix)
  const apiOrigin = apiUrl.replace(/\/api$/, '')
  const apiPattern = new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/api\\/`)

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
        manifest: {
          name: 'StudyHub - Peer-to-Peer Learning Platform',
          short_name: 'StudyHub',
          description: 'Connect with study groups, get answers to tough questions, discover shared notes, and book tutors.',
          start_url: '/',
          display: 'standalone',
          background_color: '#0a0a0a',
          theme_color: '#0066ff',
          icons: [
            {
              src: 'favicon.svg',
              sizes: '48x48',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/api\\/stats`),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'studyhub-stats-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 300 }
              }
            },
            {
              urlPattern: new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/api\\/(groups|notes|questions)`),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'studyhub-content-cache',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 100, maxAgeSeconds: 86400 }
              }
            },
            {
              urlPattern: new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/api\\/tutors`),
              handler: 'NetworkOnly'
            },
            {
              urlPattern: new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/api\\/(auth|payments|.*\\/messages|notes\\/.*\\/download)`),
              handler: 'NetworkOnly'
            }
          ]
        },
        devOptions: {
          enabled: mode === 'development'
        }
      })
    ],
  }
})
