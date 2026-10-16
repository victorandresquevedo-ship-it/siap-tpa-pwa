/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    // PWA: el service worker guarda toda la app (precache) para abrirla sin señal.
    // Solo funciona en la versión compilada (npm run build + npm run preview), no en npm run dev.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // se registra en src/pwa/registrarSW.ts
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'SIAP-TPA · Prototipo',
        short_name: 'SIAP-TPA',
        description:
          'Prototipo de demostración con datos simulados: citas de camiones y posiciones en el patio de Terminal Puerto Arica.',
        lang: 'es-CL',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#21295C',
        background_color: '#F4F7FA',
        categories: ['business', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Soy conductor', url: '/conductor', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Consola del planificador', url: '/planificador', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Cualquier ruta de la app (/conductor/cita, /planificador...) abre sin señal.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // Se pre-empaquetan al partir el servidor (si no, Vite recarga la página la primera vez que se usan).
  optimizeDeps: {
    include: ['qrcode', 'jsqr', 'idb-keyval'],
  },
  server: {
    host: true, // permite abrir la app desde el celular en la misma red wifi
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
