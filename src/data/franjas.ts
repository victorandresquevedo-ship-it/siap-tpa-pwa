// Franjas horarias de atención (1 hora, de 08:00 a 20:00), cupos y franja recomendada.
// Función pura: el momento actual entra como dato.

import { desdeFechaISO, enDia } from './fechas';
import type { Cita, DemoState, Nave } from './types';

export const PRIMERA_FRANJA = 8;
export const ULTIMA_FRANJA = 19;
/** Camiones que la garita puede atender por franja de 1 hora. */
export const CAPACIDAD_FRANJA = 10;
/** La recepción de una nave cierra estas horas antes de su embarque. */
export const HORAS_CIERRE = 6;
/** Horario punta: franjas que empiezan entre las 12:00 y las 16:00 (terminan a las 17:00). */
export const PUNTA_DESDE = 12;
export const PUNTA_HASTA = 17;

/**
 * Camiones simulados ya agendados en cada franja (además de las citas de la demo),
 * por día contado desde el día base. Después del tercer día se repite el último.
 */
const DEMANDA_SIMULADA: Record<number, number>[] = [
  { 8: 5, 9: 6, 10: 6, 11: 7, 12: 8, 13: 8, 14: 8, 15: 8, 16: 7, 17: 6, 18: 4, 19: 3 },
  { 8: 5, 9: 4, 10: 2, 11: 4, 12: 7, 13: 8, 14: 9, 15: 8, 16: 7, 17: 6, 18: 5, 19: 5 },
  { 8: 4, 9: 3, 10: 3, 11: 4, 12: 6, 13: 7, 14: 7, 15: 6, 16: 5, 17: 4, 18: 3, 19: 3 },
];

export type NivelCupos = 'verde' | 'amarillo' | 'rojo';
export type MotivoNoDisponible = 'pasada' | 'cierre' | 'completa';

export const TEXTO_NO_DISPONIBLE: Record<MotivoNoDisponible, string> = {
  pasada: 'Esa franja ya pasó.',
  cierre: 'Esa franja termina después del cierre de recepción de la nave.',
  completa: 'Esa franja no tiene cupos.',
};

export interface InfoFranja {
  /** Hora de inicio (8 a 19). */
  hora: number;
  ocupados: number;
  libres: number;
  /** Espera estimada en garita si llegas en esta franja (minutos). */
  esperaMin: number;
  nivel: NivelCupos;
  punta: boolean;
  disponible: boolean;
  motivo?: MotivoNoDisponible;
  recomendada: boolean;
  /** Es la franja que ya tiene la cita que se reprograma. */
  actual: boolean;
}

export interface OpcionesFranjas {
  ahora: Date;
  /** Cierre de recepción de la nave: la franja debe terminar antes o justo a esa hora. */
  cierre?: Date;
  /** Cita que se reprograma: su cupo no cuenta como ocupado y su franja no se recomienda. */
  reprogramando?: Pick<Cita, 'id' | 'fecha' | 'franja'>;
}

export function cierreRecepcion(nave: Pick<Nave, 'embarque'>): Date {
  return new Date(Date.parse(nave.embarque) - HORAS_CIERRE * 3_600_000);
}

export function esPunta(hora: number): boolean {
  return hora >= PUNTA_DESDE && hora < PUNTA_HASTA;
}

/** Espera estimada según qué tan llena queda la franja al sumar tu camión (42 min con la franja llena). */
export function esperaEstimada(ocupados: number, capacidad = CAPACIDAD_FRANJA): number {
  const r = Math.min((ocupados + 1) / capacidad, 1.2);
  return Math.round(8 + 34 * r * r);
}

export function nivelCupos(libres: number): NivelCupos {
  if (libres >= 4) return 'verde';
  if (libres >= 1) return 'amarillo';
  return 'rojo';
}

export function textoCupos(f: Pick<InfoFranja, 'libres'>): string {
  if (f.libres === 0) return 'Completa';
  if (f.libres === 1) return 'Queda 1 cupo';
  return f.libres < 4 ? `Quedan ${f.libres} cupos` : `${f.libres} cupos`;
}

function diasDesdeBase(diaBase: string, fecha: string): number {
  return Math.round((desdeFechaISO(fecha).getTime() - desdeFechaISO(diaBase).getTime()) / 86_400_000);
}

/** Camiones simulados (sin detalle) de una franja, además de las citas de la demo. */
export function demandaSimulada(diaBase: string, fecha: string, hora: number): number {
  const dia = diasDesdeBase(diaBase, fecha);
  return DEMANDA_SIMULADA[Math.min(Math.max(dia, 0), DEMANDA_SIMULADA.length - 1)][hora] ?? 0;
}

/** Camiones ya agendados en una franja (simulados + citas), sin contar la cita indicada. */
export function ocupacionFranja(
  estado: Pick<DemoState, 'diaBase' | 'citas'>,
  fecha: string,
  hora: number,
  sinCitaId?: string,
): number {
  const citas = estado.citas.filter((c) => c.fecha === fecha && c.franja === hora && c.id !== sinCitaId).length;
  return demandaSimulada(estado.diaBase, fecha, hora) + citas;
}

export function franjasDelDia(
  estado: Pick<DemoState, 'diaBase' | 'citas'>,
  fecha: string,
  { ahora, cierre, reprogramando }: OpcionesFranjas,
): InfoFranja[] {
  const dia = diasDesdeBase(estado.diaBase, fecha);
  const inicioDia = desdeFechaISO(fecha);

  const franjas: InfoFranja[] = [];
  for (let hora = PRIMERA_FRANJA; hora <= ULTIMA_FRANJA; hora++) {
    const ocupados = ocupacionFranja(estado, fecha, hora, reprogramando?.id);
    const libres = Math.max(0, CAPACIDAD_FRANJA - ocupados);
    const inicio = enDia(inicioDia, 0, hora);
    const fin = enDia(inicioDia, 0, hora + 1);
    let motivo: MotivoNoDisponible | undefined;
    if (dia < 0 || inicio.getTime() <= ahora.getTime()) motivo = 'pasada';
    else if (cierre && fin.getTime() > cierre.getTime()) motivo = 'cierre';
    else if (libres === 0) motivo = 'completa';
    franjas.push({
      hora,
      ocupados,
      libres,
      esperaMin: esperaEstimada(ocupados),
      nivel: nivelCupos(libres),
      punta: esPunta(hora),
      disponible: !motivo,
      motivo,
      recomendada: false,
      actual: reprogramando?.fecha === fecha && reprogramando.franja === hora,
    });
  }

  // Recomendada: la de menor espera, evitando 12:00–17:00 cuando se pueda; empate, la más temprana.
  // Al reprogramar el mismo día (el conductor se atrasó) se prefieren las franjas posteriores a la actual.
  let disponibles = franjas.filter((f) => f.disponible && !f.actual);
  if (reprogramando?.fecha === fecha && disponibles.some((f) => f.hora > reprogramando.franja)) {
    disponibles = disponibles.filter((f) => f.hora > reprogramando.franja);
  }
  const fueraDePunta = disponibles.filter((f) => !f.punta);
  const candidatas = fueraDePunta.length > 0 ? fueraDePunta : disponibles;
  const mejor = candidatas.reduce<InfoFranja | null>(
    (m, f) => (!m || f.esperaMin < m.esperaMin ? f : m),
    null,
  );
  if (mejor) mejor.recomendada = true;
  return franjas;
}

/** Frase corta que explica por qué se recomienda la franja. */
export function motivoRecomendacion(f: InfoFranja): string {
  return f.punta
    ? `Menor espera estimada (~${f.esperaMin} min). Hoy solo quedan cupos en horario punta.`
    : `Menor espera estimada (~${f.esperaMin} min) y fuera del horario punta 12:00–17:00.`;
}
