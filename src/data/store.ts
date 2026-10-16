// Capa de datos de la app. Hoy funciona solo en el navegador (IndexedDB + BroadcastChannel,
// ver localStore.ts). Para conectar una API real basta con otra implementación de DataStore:
// las pantallas solo conocen esta interfaz.

import { useEffect, useSyncExternalStore } from 'react';
import type { DatosReserva } from './acciones';
import { crearStoreLocal } from './localStore';
import type { Cita, DemoState } from './types';

export type Escucha = () => void;

export interface DataStore {
  /** Carga el estado guardado o crea los datos de ejemplo. Se puede llamar varias veces. */
  iniciar(): Promise<DemoState>;
  /** Último estado conocido; null mientras carga. */
  estado(): DemoState | null;
  /** Avisa cada vez que el estado cambia, en esta pestaña o en otra del mismo navegador. */
  suscribir(escucha: Escucha): () => void;
  /** Restaura los datos de ejemplo (botón "Reiniciar demo"). */
  reiniciarDemo(): Promise<void>;

  // Modo conductor. Si la operación no se puede hacer, lanzan ErrorDemo con el mensaje para mostrar.
  aceptarConsentimiento(): Promise<void>;
  elegirConductor(conductorId: string): Promise<void>;
  reservarCita(datos: DatosReserva): Promise<Cita>;
  reprogramarCita(citaId: string, fecha: string, franja: number): Promise<Cita>;
  borrarMisDatos(): Promise<void>;
  // Las operaciones del planificador (aceptar o modificar posición) se agregan en la Fase 4.
}

export const store: DataStore = crearStoreLocal();

/** Estado de la demo para React; null mientras carga. */
export function useDemo(): DemoState | null {
  useEffect(() => {
    void store.iniciar();
  }, []);
  return useSyncExternalStore(store.suscribir, store.estado, store.estado);
}
