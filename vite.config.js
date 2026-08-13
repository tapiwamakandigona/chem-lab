import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

const generatedInputs = path.resolve('.generated/inputs.json')
const buildInputs = fs.existsSync(generatedInputs)
  ? JSON.parse(fs.readFileSync(generatedInputs, 'utf8'))
  : { main: path.resolve('index.html') }

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The workbox glob already includes PNG icons; avoid adding manifest icons twice.
      includeManifestIcons: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,txt}'],
        // vendor-three chunk is ~1 MB raw; raise the precache cap
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
      manifest: {
        name: 'ChemLab ZW — Virtual Chemistry Lab',
        short_name: 'ChemLab ZW',
        description:
          'Cambridge AS/A Level Chemistry (9701) virtual lab — fourteen interactive practicals and a 19-unit course that work fully offline.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  build: {
    rollupOptions: {
      input: buildInputs,
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
          // Keep the complete rendering engine in the lazy LabViewport graph.
          // Splitting Three/R3F into a manual vendor chunk made Rolldown hoist
          // shared runtime bindings into the launcher entry, so every landing
          // visit downloaded ~304 kB gzip before a practical was chosen.
        }
      }
    }
  }
})
