// Registro del service worker (vite-plugin-pwa). Avisa una vez cuando la app quedó guardada
// en el equipo y ya puede abrirse sin señal.

import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

let listaSinSenal = false;
const escuchas = new Set<() => void>();

export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onOfflineReady() {
      listaSinSenal = true;
      escuchas.forEach((e) => e());
    },
  });
}

/** true desde que el service worker terminó de guardar la app (primera visita). */
export function useListaSinSenal(): boolean {
  return useSyncExternalStore(
    (e) => {
      escuchas.add(e);
      return () => escuchas.delete(e);
    },
    () => listaSinSenal,
    () => false,
  );
}
