/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const basePath = (env.VITE_BASE_PATH || (mode === 'production' ? '/' : '/')).replace(/\/?$/, '/')
  const n8nBase = (env.VITE_N8N_BASE_URL || 'https://workflow.robdev.website').replace(/\/$/, '')

  return {
    base: basePath,
    plugins: [
      vue(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'robots.txt', 'vite.svg'],
        manifest: {
          name: 'WhatsApp Instagram Manager',
          short_name: 'WIM',
          start_url: basePath,
          scope: basePath,
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#0ea5e9',
          icons: []
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
        }
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/webhook': {
          target: n8nBase,
          changeOrigin: true,
          secure: true,
        },
        '/webhook-test': {
          target: n8nBase,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      target: 'es2018',
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia']
          }
        }
      }
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    test: {
      globals: true,
      environment: 'jsdom',
    }
  } as any
}) // Force cast to any to bypass Vitest type conflict
