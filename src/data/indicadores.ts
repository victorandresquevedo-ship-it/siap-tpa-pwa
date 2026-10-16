// Indicadores del turno (M1 a M8) del proyecto: valor actual, meta, línea base y semáforo.
// Los que se pueden medir con los datos de la demo se calculan; el resto son estimaciones
// simuladas y se marcan así en pantalla.

import { fechaISO } from './fechas';
import { PRIMERA_FRANJA, PUNTA_DESDE, PUNTA_HASTA, ULTIMA_FRANJA, ocupacionFranja } from './franjas';
import type { DemoState } from './types';

export type CodigoIndicador = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8';
export type NivelIndicador = 'verde' | 'amarillo' | 'rojo';

export interface Indicador {
  codigo: CodigoIndicador;
  nombre: string;
  /** Valor principal formateado ("38,5 min"). */
  valor: string;
  /** Comparación con la línea base ("−3,5 min frente a 42 min"). */
  comparacion: string;
  meta: string;
  nivel: NivelIndicador;
  /** "demo": calculado con los datos de la demo; "simulado": estimación. */
  fuente: 'demo' | 'simulado';
  /** Cómo se calcula, en una línea. */
  detalle: string;
}

/** Líneas base del diagnóstico (antes de SIAP-TPA). */
export const LINEA_BASE = {
  atencionMin: 42,
  remanejosPorTurno: 40,
  conCitaPct: 0,
  cumplimientoFranjaPct: 50,
  concentracionPuntaPct: 68,
  consultasPorTurno: 120,
};

/** Camiones que llegan sin cita en un día de la demo (simulado). */
export const SIN_CITA_SIMULADOS = 45;

export const TEXTO_NIVEL: Record<NivelIndicador, string> = {
  verde: 'Cumple la meta',
  amarillo: 'Cerca de la meta',
  rojo: 'Lejos de la meta',
};

/** Avance hacia la meta: 1 o más = cumple; desde 0,5 = cerca; menos = lejos. */
export function nivelPorAvance(base: number, meta: number, actual: number): NivelIndicador {
  const avance = (actual - base) / (meta - base);
  if (avance >= 1 - 1e-9) return 'verde';
  if (avance >= 0.5) return 'amarillo';
  return 'rojo';
}

const num = (x: number, decimales = 1) => x.toLocaleString('es-CL', { maximumFractionDigits: decimales });
const pct = (x: number) => `${num(x * 100, 0)}%`;
const conSigno = (x: number, decimales = 1) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x), decimales)}`;

/** Datos medidos en la demo que alimentan los indicadores (también los usa la consola). */
export function medicionesDemo(estado: DemoState, hoy: Date = new Date()) {
  const atendidas = estado.citas.filter((c) => c.estado === 'atendido' && c.atencion);
  const decididas = estado.citas.filter((c) => c.posicion);
  const aceptadas = decididas.filter((c) => c.posicion!.decision === 'aceptada');
  const fecha = fechaISO(hoy);
  let agendadosHoy = 0;
  let enPuntaHoy = 0;
  for (let h = PRIMERA_FRANJA; h <= ULTIMA_FRANJA; h++) {
    const n = ocupacionFranja(estado, fecha, h);
    agendadosHoy += n;
    if (h >= PUNTA_DESDE && h < PUNTA_HASTA) enPuntaHoy += n;
  }
  return {
    atendidas: atendidas.length,
    atencionPromedio: atendidas.length
      ? atendidas.reduce((s, c) => s + c.atencion!.minutos, 0) / atendidas.length
      : LINEA_BASE.atencionMin,
    decididas: decididas.length,
    aceptadasRatio: decididas.length ? aceptadas.length / decididas.length : 0,
    dentroDeFranjaRatio: atendidas.length
      ? atendidas.filter((c) => c.atencion!.dentroDeFranja).length / atendidas.length
      : 0,
    conCitaRatio: agendadosHoy / (agendadosHoy + SIN_CITA_SIMULADOS),
    concentracionPuntaRatio: agendadosHoy ? enPuntaHoy / agendadosHoy : 0,
  };
}

export function calcularIndicadores(estado: DemoState, hoy: Date = new Date()): Indicador[] {
  const m = medicionesDemo(estado, hoy);
  const B = LINEA_BASE;

  const metaAtencion = B.atencionMin * 0.9; // −10% de espera
  const remanejos = B.remanejosPorTurno * (1 - 0.4 * m.aceptadasRatio);
  const metaRemanejos = B.remanejosPorTurno * 0.7;
  const eficiencia = (B.atencionMin / m.atencionPromedio - 1) * 100;
  const consultas = B.consultasPorTurno * (1 - 0.55 * m.conCitaRatio);
  const metaConsultas = B.consultasPorTurno * 0.5;
  const concentracion = m.concentracionPuntaRatio * 100;
  const metaConcentracion = B.concentracionPuntaPct - 20;

  return [
    {
      codigo: 'M1',
      nombre: 'Tiempo de atención',
      valor: `${num(m.atencionPromedio)} min`,
      comparacion: `${conSigno(m.atencionPromedio - B.atencionMin)} min frente a ${B.atencionMin} min`,
      meta: `${num(metaAtencion)} min o menos`,
      nivel: nivelPorAvance(B.atencionMin, metaAtencion, m.atencionPromedio),
      fuente: 'demo',
      detalle: `Promedio de los ${m.atendidas} camiones atendidos en la demo.`,
    },
    {
      codigo: 'M2',
      nombre: 'Remanejos',
      valor: `${num(remanejos, 0)} por turno`,
      comparacion: `${conSigno((remanejos / B.remanejosPorTurno - 1) * 100, 0)}% frente a ${B.remanejosPorTurno}`,
      meta: '−30% (28 o menos)',
      nivel: nivelPorAvance(B.remanejosPorTurno, metaRemanejos, remanejos),
      fuente: 'simulado',
      detalle: 'Estimado: cada sugerencia aceptada respeta la segregación por nave, puerto y peso.',
    },
    {
      codigo: 'M3',
      nombre: 'Eficiencia',
      valor: `${conSigno(eficiencia, 0)}%`,
      comparacion: 'camiones atendidos por hora frente a la línea base',
      meta: '+15%',
      nivel: nivelPorAvance(0, 15, eficiencia),
      fuente: 'simulado',
      detalle: 'Estimado a partir del tiempo de atención (M1).',
    },
    {
      codigo: 'M4',
      nombre: 'Sugerencias aceptadas',
      valor: pct(m.aceptadasRatio),
      comparacion: `${Math.round(m.aceptadasRatio * m.decididas)} de ${m.decididas} posiciones sin modificar`,
      meta: '70% o más',
      nivel: nivelPorAvance(0, 70, m.aceptadasRatio * 100),
      fuente: 'demo',
      detalle: 'Posiciones aceptadas tal como las sugirió el motor.',
    },
    {
      codigo: 'M5',
      nombre: 'Camiones con cita',
      valor: pct(m.conCitaRatio),
      comparacion: `${SIN_CITA_SIMULADOS} camiones sin cita hoy (simulados)`,
      meta: '60% o más',
      nivel: nivelPorAvance(B.conCitaPct, 60, m.conCitaRatio * 100),
      fuente: 'demo',
      detalle: 'Camiones agendados hoy sobre el total que llega a la terminal.',
    },
    {
      codigo: 'M6',
      nombre: 'Cumplimiento de franja',
      valor: pct(m.dentroDeFranjaRatio),
      comparacion: `línea base ${B.cumplimientoFranjaPct}%`,
      meta: '75% o más',
      nivel: nivelPorAvance(B.cumplimientoFranjaPct, 75, m.dentroDeFranjaRatio * 100),
      fuente: 'demo',
      detalle: 'Camiones atendidos que llegaron dentro de su franja.',
    },
    {
      codigo: 'M7',
      nombre: 'Concentración 12:00–17:00',
      valor: `${num(concentracion, 0)}%`,
      comparacion: `${conSigno(concentracion - B.concentracionPuntaPct, 0)} pp frente a ${B.concentracionPuntaPct}%`,
      meta: `−20 pp (${metaConcentracion}% o menos)`,
      nivel: nivelPorAvance(B.concentracionPuntaPct, metaConcentracion, concentracion),
      fuente: 'demo',
      detalle: 'Camiones agendados hoy entre 12:00 y 17:00. Baja con cada reserva fuera de punta.',
    },
    {
      codigo: 'M8',
      nombre: 'Consultas al personal',
      valor: `${num(consultas, 0)} por turno`,
      comparacion: `${conSigno((consultas / B.consultasPorTurno - 1) * 100, 0)}% frente a ${B.consultasPorTurno}`,
      meta: `−50% (${metaConsultas} o menos)`,
      nivel: nivelPorAvance(B.consultasPorTurno, metaConsultas, consultas),
      fuente: 'simulado',
      detalle: 'Estimado: baja cuando el conductor ve su hora y su posición en la app (M5).',
    },
  ];
}
