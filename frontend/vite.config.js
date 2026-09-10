import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Public, indexable routes. Everything else in the app sits behind auth and is
// disallowed in robots.txt below — a crawler that follows those only ever gets
// the login redirect, which is noise in the index.
const PUBLIC_ROUTES = [
  { path: '/',         changefreq: 'weekly',  priority: '1.0' },
  { path: '/about',    changefreq: 'monthly', priority: '0.8' },
  { path: '/register', changefreq: 'monthly', priority: '0.8' },
  { path: '/login',    changefreq: 'yearly',  priority: '0.5' },
  { path: '/privacy',  changefreq: 'yearly',  priority: '0.3' },
  { path: '/terms',    changefreq: 'yearly',  priority: '0.3' },
  { path: '/cookies',  changefreq: 'yearly',  priority: '0.3' },
  { path: '/contact',  changefreq: 'yearly',  priority: '0.6' },
]

const PRIVATE_PREFIXES = [
  '/dashboard', '/profile', '/groups', '/notes', '/qa', '/settings',
  '/become-tutor', '/tutors', '/tutor/', '/tutor-dashboard', '/admin',
  '/premium', '/socket-test',
]

/**
 * Emits robots.txt and sitemap.xml at build time so both carry the real
 * deployed origin rather than a hardcoded guess. Absolute URLs are mandatory
 * in a sitemap; a relative one is silently ignored by crawlers.
 */
function seoFiles(siteUrl) {
  const origin = siteUrl.replace(/\/+$/, '')
  return {
    name: 'studyhub-seo-files',
    apply: 'build',
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10)

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_ROUTES.map(r => `  <url>
    <loc>${origin}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`
      const robots = `# StudyHub
User-agent: *
Allow: /
${PRIVATE_PREFIXES.map(p => `Disallow: ${p}`).join('\n')}

Sitemap: ${origin}/sitemap.xml
`
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:5000/api'
  // Build a regex that matches the API origin (strips /api suffix)
  const apiOrigin = apiUrl.replace(/\/api$/, '')
  const siteUrl = env.VITE_SITE_URL || 'http://localhost:5173'

  return {
    plugins: [
      react(),
      tailwindcss(),
      seoFiles(siteUrl),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
        manifest: {
          name: 'StudyHub - Peer-to-Peer Learning Platform',
          short_name: 'StudyHub',
          description: 'Connect with study groups, get answers to tough questions, discover shared notes, and book tutors.',
          start_url: '/',
          display: 'standalone',
          background_color: '#0b0d10',
          theme_color: '#3b82f6',
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
          // The social-preview card is only ever fetched by link scrapers, so
          // precaching 80KB of it onto every visitor's device is pure waste.
          globIgnores: ['**/og-image.png'],
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
