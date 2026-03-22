import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'logo-192.png', 'logo-512.png'],
      manifest: {
        name: 'BiteSight',
        short_name: 'BiteSight',
        description: 'Snap food, track calories with AI',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        dir: 'ltr',
        lang: 'en',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'portrait',
        id: '/bite-sight',
        start_url: '/',
        categories: ['health', 'food', 'fitness', 'lifestyle'],
        prefer_related_applications: false,
        screenshots: [
          {
            src: 'screenshots/sc-wide.png',
            sizes: '1448x513',
            type: 'image/png',
            form_factor: 'wide',
            label: 'BiteSight Desktop',
          },
          {
            src: 'screenshots/sc1.jpg',
            sizes: '1080x2376',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'BiteSight Home',
          },
          {
            src: 'screenshots/sc2.jpg',
            sizes: '1080x2376',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'BiteSight Tracking',
          },
          {
            src: 'screenshots/sc3.jpg',
            sizes: '1080x2376',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'BiteSight History',
          },
        ],
        icons: [
          { src: 'logo-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
