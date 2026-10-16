// Datos del seguimiento del conductor: tiempo estimado con su motivo y lugar en la fila.

import { CAPACIDAD_FRANJA, demandaSimulada, esperaEstimada, ocupacionFranja } from './franjas';
import type { CambioTiempo, Cita, DemoState, EstadoCita } from './types';

/** Recorrido del camión: los hitos que registra la terminal. */
export const ORDEN_ESTADOS: EstadoCita[] = ['reservada', 'en_ruta', 'antepuerto', 'garita', 'atendido'];

export const TEXTO_ESTADO: Record<EstadoCita, string> = {
  reservada: 'Reservada',
  en_ruta: 'En ruta',
  antepuerto: 'En antepuerto',
  garita: 'En garita',
  atendido: 'Atendido',
};

export function tiempoVigente(cita: Pick<Cita, 'tiempoEstimado'>): CambioTiempo | undefined {
  return cita.tiempoEstimado.at(-1);
}

/** Primera estimación de una cita: la espera esperada según lo ocupada que está su franja. */
export function estimarAlReservar(
  estado: Pick<DemoState, 'diaBase' | 'citas'>,
  fecha: string,
  hora: number,
  sinCitaId?: string,
): { minutos: number; tomados: number; motivo: string } {
  const ocupados = ocupacionFranja(estado, fecha, hora, sinCitaId);
  const tomados = ocupados + 1;
  return {
    minutos: esperaEstimada(ocupados),
    tomados,
    motivo: `Según la ocupación de tu franja (${tomados} de ${CAPACIDAD_FRANJA} cupos tomados)`,
  };
}

/** "+6 min: Andes Express adelantó su embarque" o solo el motivo si es la primera estimación. */
export function textoMotivoTiempo(c: CambioTiempo): string {
  if (c.delta === 0) return c.motivo;
  const signo = c.delta > 0 ? '+' : '−';
  return `${signo}${Math.abs(c.delta)} min: ${c.motivo}`;
}

/**
 * Lugar en la fila de la franja: primero los camiones simulados (ya agendados), luego las citas
 * de la demo en el orden en que entraron a la franja.
 */
export function lugarEnFila(estado: Pick<DemoState, 'diaBase' | 'citas'>, cita: Cita): { lugar: number; total: number } {
  const enFranja = estado.citas
    .filter((c) => c.fecha === cita.fecha && c.franja === cita.franja)
    .sort((a, b) => a.enFilaDesde.localeCompare(b.enFilaDesde) || a.id.localeCompare(b.id));
  const simulados = demandaSimulada(estado.diaBase, cita.fecha, cita.franja);
  return {
    lugar: simulados + enFranja.findIndex((c) => c.id === cita.id) + 1,
    total: simulados + enFranja.length,
  };
}
