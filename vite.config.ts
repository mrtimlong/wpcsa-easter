/// <reference types="vitest/config" />
import preact from '@preact/preset-vite'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { defineConfig, type Connect, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const THEME_COLOR = '#1a2b9b'

/** Local data folder: $DATA_DIR, else ./data (real data, gitignored), else ./sample-data. */
export const dataDir = resolve(process.env.DATA_DIR ?? (existsSync('data') ? 'data' : 'sample-data'))

const contentTypes: Record<string, string> = {
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
}

/**
 * Serves the data folder at /data/ in `vite dev` and `vite preview`, the way S3/CloudFront does
 * in production. The data is never part of the build.
 */
function serveData(): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = decodeURIComponent((req.url ?? '').split('?')[0])
    if (!path.startsWith('/data/')) return next()
    const file = resolve(dataDir, path.slice('/data/'.length))
    if (!file.startsWith(dataDir + sep) || !existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404
      return res.end()
    }
    res.setHeader('Content-Type', contentTypes[extname(file)] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(readFileSync(file))
  }
  return {
    name: 'serve-data',
    configureServer(server) {
      server.config.logger.info(`  Serving /data/ from ${dataDir}`)
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [
    preact(),
    serveData(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SACSA Easter Tournament',
        short_name: 'SACSA Easter',
        description: 'Fixtures, results and info for the SACSA Easter Tournament',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: THEME_COLOR,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/data\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Tournament data: always try for the latest, but work offline with the last copy.
            urlPattern: ({ url }) => url.pathname.startsWith('/data/') && url.pathname.endsWith('.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'data', networkTimeoutSeconds: 5 },
          },
          {
            // Photos and logos from the data folder can be replaced under the same name.
            urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'data-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // Site photos are too big to precache; keep them once viewed.
            urlPattern: ({ url }) => url.pathname.startsWith('/images/generated/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos',
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    env: { DATA_DIR: dataDir },
  },
})
