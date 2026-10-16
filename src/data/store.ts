// Capa de datos de la app. Hoy funciona solo en el navegador (IndexedDB + BroadcastChannel,
// ver localStore.ts). Para conectar una API real basta con otra implementación de DataStore:
// las pantallas solo conocen esta interfaz.

import { useEffect, useSyncExternalStore } from 'react';
import type { DatosReserva, DecisionPosicion, OpcionesAtencion } from './acciones';
import { crearStoreLocal } from './localStore';
import type { PaqueteCita } from './paquete';
import type { Cita, DemoState, EstadoCita } from './types';

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
  responderEncuesta(citaId: string, nota: 1 | 2 | 3 | 4 | 5): Promise<void>;
  marcarAvisosVistos(citaId: string): Promise<void>;
  /**
   * Carga la cita que trae el QR de "Modo demo dos dispositivos". comoConductor (por defecto sí)
   * la deja como la cita de este teléfono; en la consola se usa false.
   */
  importarCita(paquete: PaqueteCita, opciones?: { comoConductor?: boolean }): Promise<Cita>;

  // Planificador y terminal.
  decidirPosicion(citaId: string, decision: DecisionPosicion): Promise<Cita>;
  registrarHito(citaId: string, estado: EstadoCita, opciones?: OpcionesAtencion): Promise<Cita>;
  adelantarEmbarque(naveId: string, horas: number): Promise<number>;
}

export const store: DataStore = crearStoreLocal();

/** Estado de la demo para React; null mientras carga. */
export function useDemo(): DemoState | null {
  useEffect(() => {
    void store.iniciar();
  }, []);
  return useSyncExternalStore(store.suscribir, store.estado, store.estado);
}
