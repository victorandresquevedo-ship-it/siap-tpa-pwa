/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La configuración PWA (vite-plugin-pwa) se agrega en la Fase 5.
export default defineConfig({
  plugins: [react()],
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
