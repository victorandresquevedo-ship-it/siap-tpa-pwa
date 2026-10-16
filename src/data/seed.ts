// Datos de ejemplo de la demo. Todo es ficticio (naves, navieras, conductores, patentes,
// teléfonos y contenedores). Las fechas se calculan desde el día de la demo, así que la
// demo funciona cualquier día; con el mismo día el resultado es siempre el mismo.

import { asignar, type ContenedorAsignable } from '../engine/assign';
import {
  BLOQUES,
  CAPACIDAD_BLOQUE,
  FILAS,
  NIVELES,
  colocar,
  crearBloqueVacio,
  indicePila,
  tramoPeso,
  type Patio,
  type Pila,
} from '../engine/yard';
import { enDia, fechaISO } from './fechas';
import { estimarAlReservar } from './seguimiento';
import type {
  Cita,
  Conductor,
  Contenedor,
  DemoState,
  EstadoCita,
  Evento,
  MotivoCambio,
  Nacionalidad,
  Nave,
  Puerto,
} from './types';

/** Sube este número cuando cambie la forma de DemoState: fuerza a regenerar los datos guardados. */
export const VERSION_ESQUEMA = 4;

export const PUERTOS: Puerto[] = [
  { codigo: 'CNSHA', nombre: 'Shanghái', pais: 'China', region: 'Asia' },
  { codigo: 'KRPUS', nombre: 'Busan', pais: 'Corea del Sur', region: 'Asia' },
  { codigo: 'NLRTM', nombre: 'Róterdam', pais: 'Países Bajos', region: 'Europa' },
  { codigo: 'DEHAM', nombre: 'Hamburgo', pais: 'Alemania', region: 'Europa' },
  { codigo: 'USLGB', nombre: 'Long Beach', pais: 'EE.UU.', region: 'EE.UU.' },
  { codigo: 'USPHL', nombre: 'Filadelfia', pais: 'EE.UU.', region: 'EE.UU.' },
];

// ---------- Sigla de contenedor ISO 6346 (con dígito de control válido) ----------

const VALOR_LETRA: Record<string, number> = (() => {
  const valores: Record<string, number> = {};
  let v = 10;
  for (const letra of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (v % 11 === 0) v++;
    valores[letra] = v++;
  }
  return valores;
})();

export function digitoControl(base10: string): number {
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    const ch = base10[i];
    suma += (/\d/.test(ch) ? Number(ch) : VALOR_LETRA[ch]) * 2 ** i;
  }
  return (suma % 11) % 10;
}

export function sigla(dueno: string, serie: number): string {
  const base = dueno + String(serie).padStart(6, '0');
  return base + digitoControl(base);
}

export function siglaValida(id: string): boolean {
  return /^[A-Z]{3}U\d{7}$/.test(id) && digitoControl(id.slice(0, 10)) === Number(id[10]);
}

// ---------- Generador pseudoaleatorio con semilla fija (solo para poblar el patio) ----------

function mulberry32(semilla: number) {
  let s = semilla;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Naves y conductores ----------

function crearNaves(base: Date): Nave[] {
  return [
    { id: 'N1', nombre: 'Andes Express', naviera: 'Línea Cordillera', sitio: 4, embarque: enDia(base, 2, 8).toISOString(), destinos: ['CNSHA', 'KRPUS'] },
    { id: 'N2', nombre: 'Altiplano Star', naviera: 'Naviera Cóndor', sitio: 5, embarque: enDia(base, 1, 22).toISOString(), destinos: ['NLRTM', 'DEHAM'] },
    { id: 'N3', nombre: 'Pacífico Sur', naviera: 'Austral Box Lines', sitio: 2, embarque: enDia(base, 2, 14).toISOString(), destinos: ['USLGB', 'USPHL'] },
    { id: 'N4', nombre: 'Atacama Bridge', naviera: 'Línea Cordillera', sitio: 3, embarque: enDia(base, 0, 23).toISOString(), destinos: ['CNSHA', 'USLGB'] },
  ];
}

const CONDUCTORES_BASE: [string, Nacionalidad, string][] = [
  ['Juan Carlos Mamani', 'BO', '3481-KTR'],
  ['Rubén Quispe', 'BO', '2179-HLN'],
  ['Patricio Rojas', 'CL', 'KXTR-21'],
  ['Wilson Condori', 'BO', '4520-PBD'],
  ['Marco Antonio Flores', 'BO', '1896-GZK'],
  ['Edwin Huanca', 'BO', '3307-RFT'],
  ['Claudio Muñoz', 'CL', 'JDLP-48'],
  ['Rolando Apaza', 'BO', '2764-NSC'],
  ['Néstor Limachi', 'BO', '4091-KMB'],
  ['Grover Callisaya', 'BO', '1653-TXR'],
  ['Luis Contreras', 'CL', 'HSBW-73'],
  ['Ramiro Ticona', 'BO', '3925-LVD'],
  ['Elvis Copa', 'BO', '2238-PHG'],
  ['Hugo Villca', 'BO', '4417-CRZ'],
  ['Rodrigo Soto', 'CL', 'GKFZ-15'],
  ['Javier Choque', 'BO', '3168-BTN'],
  ['Simón Cruz', 'BO', '2846-ZSL'],
  ['Cristián Araya', 'CL', 'LRVP-62'],
  ['Óscar Mendoza', 'BO', '4732-HKD'],
  ['Germán Alanoca', 'BO', '1984-YPM'],
  // Conductores de ejemplo para la demo (sin cita al inicio).
  ['Freddy Choque', 'BO', '2817-LPZ'],
  ['Manuel Vega', 'CL', 'PZRT-37'],
];

function telefono(nac: Nacionalidad, i: number): string {
  const n = String(i + 1).padStart(2, '0');
  return nac === 'BO' ? `+591 7000 01${n}` : `+56 9 5000 01${n}`;
}

function crearConductores(): Conductor[] {
  return CONDUCTORES_BASE.map(([nombre, nacionalidad, patente], i) => ({
    id: `D${String(i + 1).padStart(2, '0')}`,
    nombre,
    patente,
    telefono: telefono(nacionalidad, i),
    nacionalidad,
  }));
}

/** Conductores y guías de ejemplo para la reserva (selector nacional / boliviano). */
export const EJEMPLOS = {
  boliviano: { conductorId: 'D21', contenedorId: sigla('ANDU', 245871), guia: '0045871' },
  nacional: { conductorId: 'D22', contenedorId: sigla('HUMU', 245872), guia: '0045872' },
} as const;

// ---------- Citas del día ----------

type FilaCita = [franja: number, dia: number, naveId: string, puerto: string, pesoT: number, tipo: '20' | '40', estado: EstadoCita];

const CITAS_BASE: FilaCita[] = [
  [8, 0, 'N4', 'CNSHA', 24.1, '40', 'atendido'],
  [8, 0, 'N2', 'NLRTM', 18.6, '40', 'atendido'],
  [9, 0, 'N4', 'USLGB', 21.3, '40', 'atendido'],
  [10, 0, 'N1', 'CNSHA', 26.8, '40', 'atendido'],
  [10, 0, 'N2', 'DEHAM', 12.4, '20', 'atendido'],
  [11, 0, 'N3', 'USLGB', 22.7, '40', 'atendido'],
  [12, 0, 'N1', 'KRPUS', 19.9, '40', 'garita'],
  [12, 0, 'N4', 'CNSHA', 25.2, '40', 'garita'],
  [13, 0, 'N2', 'NLRTM', 23.5, '40', 'antepuerto'],
  [13, 0, 'N1', 'CNSHA', 20.8, '40', 'antepuerto'],
  [13, 0, 'N3', 'USPHL', 14.2, '20', 'antepuerto'],
  [14, 0, 'N4', 'USLGB', 27.4, '40', 'en_ruta'],
  [14, 0, 'N2', 'DEHAM', 22.1, '40', 'en_ruta'],
  [14, 0, 'N1', 'CNSHA', 24.9, '40', 'en_ruta'],
  [15, 0, 'N3', 'USLGB', 17.3, '40', 'en_ruta'],
  [15, 0, 'N1', 'KRPUS', 21.6, '40', 'en_ruta'],
  [15, 0, 'N2', 'NLRTM', 26.0, '40', 'en_ruta'],
  [16, 0, 'N4', 'CNSHA', 23.3, '40', 'reservada'],
  [16, 0, 'N3', 'USPHL', 19.4, '40', 'reservada'],
  [17, 0, 'N2', 'DEHAM', 11.8, '20', 'reservada'],
  [18, 0, 'N1', 'CNSHA', 22.6, '40', 'reservada'],
  [18, 0, 'N3', 'USLGB', 25.7, '40', 'reservada'],
  [19, 0, 'N2', 'NLRTM', 20.2, '40', 'reservada'],
  [9, 1, 'N3', 'USPHL', 24.4, '40', 'reservada'],
  [11, 1, 'N3', 'USLGB', 18.1, '40', 'reservada'],
];

/** Citas cuya posición el planificador modificó (índice → motivo). El resto se aceptó tal cual. */
const MODIFICADAS: Record<number, MotivoCambio> = { 2: 'bloque_lleno', 8: 'pedido_patio', 12: 'mantencion', 15: 'otro' };

/** Atenciones ya cerradas (citas en estado "atendido"). */
const ATENCIONES: { minutos: number; dentroDeFranja: boolean; encuesta: 1 | 2 | 3 | 4 | 5 }[] = [
  { minutos: 44, dentroDeFranja: true, encuesta: 4 },
  { minutos: 39, dentroDeFranja: false, encuesta: 2 },
  { minutos: 36, dentroDeFranja: true, encuesta: 4 },
  { minutos: 41, dentroDeFranja: true, encuesta: 5 },
  { minutos: 33, dentroDeFranja: true, encuesta: 4 },
  { minutos: 38, dentroDeFranja: false, encuesta: 3 },
];

const DUENOS = ['TPAU', 'ARIU', 'SIAU', 'ANDU', 'HUMU'];

// ---------- Patio inicial ----------

interface PlanBloque {
  distanciaM: number;
  mantencion?: boolean;
  ocupacion: number;
  /** Bahías asignadas a cada nave y destino: [desde, hasta, nave, puerto]. */
  zonas: [number, number, string, string][];
}

const PLAN_PATIO: Record<number, PlanBloque> = {
  10: { distanciaM: 150, ocupacion: 0.82, zonas: [[1, 6, 'N4', 'CNSHA'], [7, 12, 'N4', 'USLGB'], [13, 20, 'N2', 'NLRTM']] },
  20: { distanciaM: 195, ocupacion: 0.4, mantencion: true, zonas: [[1, 10, 'N3', 'USLGB'], [11, 20, 'N3', 'USPHL']] },
  30: { distanciaM: 240, ocupacion: 0.93, zonas: [[1, 10, 'N2', 'DEHAM'], [11, 20, 'N2', 'NLRTM']] },
  40: { distanciaM: 285, ocupacion: 0.64, zonas: [[1, 8, 'N1', 'CNSHA'], [9, 12, 'N1', 'KRPUS'], [13, 16, 'N3', 'USLGB']] },
  50: { distanciaM: 330, ocupacion: 0.71, zonas: [[1, 7, 'N2', 'NLRTM'], [8, 14, 'N4', 'CNSHA'], [15, 20, 'N3', 'USPHL']] },
  60: { distanciaM: 375, ocupacion: 0.48, zonas: [[1, 6, 'N1', 'KRPUS'], [7, 12, 'N3', 'USLGB']] },
  70: { distanciaM: 420, ocupacion: 0.58, zonas: [[1, 10, 'N2', 'DEHAM'], [11, 16, 'N4', 'USLGB']] },
  80: { distanciaM: 465, ocupacion: 0.37, zonas: [[1, 8, 'N3', 'USPHL'], [9, 12, 'N1', 'CNSHA']] },
  90: { distanciaM: 510, ocupacion: 0.22, zonas: [[1, 6, 'N4', 'CNSHA']] },
};

function crearPatioInicial(): Patio {
  const azar = mulberry32(2131);
  let serie = 300000;
  const bloques = BLOQUES.map((id) => {
    const plan = PLAN_PATIO[id];
    const bloque = crearBloqueVacio(id, plan.distanciaM, plan.mantencion);
    const pilas: { pila: Pila; naveId: string; puerto: string }[] = [];
    for (const [desde, hasta, naveId, puerto] of plan.zonas) {
      for (let bahia = desde; bahia <= hasta; bahia++) {
        for (let fila = 1; fila <= FILAS; fila++) {
          pilas.push({ pila: bloque.pilas[indicePila(bahia, fila)], naveId, puerto });
        }
      }
    }
    const meta = Math.min(Math.round(plan.ocupacion * CAPACIDAD_BLOQUE), pilas.length * NIVELES);
    let libres = pilas.slice();
    for (let n = 0; n < meta; n++) {
      const i = Math.floor(azar() * libres.length);
      const { pila, naveId, puerto } = libres[i];
      pila.carga.push({
        contenedorId: sigla(DUENOS[serie % DUENOS.length], serie++),
        naveId,
        puerto,
        tramo: 3 + Math.floor(azar() * 7),
      });
      if (pila.carga.length >= NIVELES) libres = libres.filter((_, j) => j !== i);
    }
    return bloque;
  });
  return { bloques };
}

// ---------- Estado completo ----------

export function nombrePuerto(codigo: string): string {
  return PUERTOS.find((p) => p.codigo === codigo)?.nombre ?? codigo;
}

/** Datos que necesita el motor a partir de un contenedor de la demo. */
export function contenedorAsignable(estado: Pick<DemoState, 'naves'>, c: Contenedor): ContenedorAsignable {
  const nave = estado.naves.find((n) => n.id === c.naveId);
  if (!nave) throw new Error(`Nave ${c.naveId} no existe`);
  return {
    id: c.id,
    naveId: c.naveId,
    naveNombre: nave.nombre,
    puerto: c.puerto,
    puertoNombre: nombrePuerto(c.puerto),
    pesoT: c.pesoT,
    embarque: nave.embarque,
  };
}

export function crearEstadoDemo(ahora: Date = new Date()): DemoState {
  const naves = crearNaves(ahora);
  const conductores = crearConductores();
  const contenedores: Contenedor[] = [];
  const citas: Cita[] = [];
  const eventos: Evento[] = [];
  let patio = crearPatioInicial();
  const diaBase = fechaISO(ahora);
  const decisionISO = enDia(ahora, 0, 6).toISOString();
  const evento = (e: Omit<Evento, 'id'>) =>
    eventos.push({ id: `E${String(eventos.length + 1).padStart(3, '0')}`, ...e });

  let atendidas = 0;
  CITAS_BASE.forEach(([franja, dia, naveId, puerto, pesoT, tipo, estado], i) => {
    const contenedor: Contenedor = {
      id: sigla(DUENOS[i % DUENOS.length], 100000 + i * 7919),
      naveId,
      puerto,
      pesoT,
      tipo,
      guia: `00451${String(i + 1).padStart(2, '0')}`,
    };
    contenedores.push(contenedor);

    const id = `C${String(i + 1).padStart(3, '0')}`;
    const creadaEn = (dia === 0 ? enDia(ahora, -1, 18, i) : enDia(ahora, 0, 7, i)).toISOString();
    const fecha = fechaISO(enDia(ahora, dia, 0));
    const estimacion = estimarAlReservar({ diaBase, citas }, fecha, franja);
    const cita: Cita = {
      id,
      contenedorId: contenedor.id,
      conductorId: conductores[i % 20].id,
      fecha,
      franja,
      estado,
      posicion: null,
      reprogramaciones: 0,
      enFilaDesde: creadaEn,
      tiempoEstimado: [{ en: creadaEn, minutos: estimacion.minutos, delta: 0, motivo: estimacion.motivo }],
      avisos: [],
      creadaEn,
      actualizadaEn: creadaEn,
    };
    evento({ tipo: 'cita_reservada', citaId: id, en: creadaEn, detalle: `Cita ${id} reservada` });

    if (estado !== 'reservada') {
      const r = asignar({ contenedor: contenedorAsignable({ naves }, contenedor), patio, ahora: decisionISO });
      const motivo = MODIFICADAS[i];
      const elegida = motivo ? r.alternativas[0] : r.mejor;
      if (!r.mejor || !elegida) throw new Error(`Sin posición para ${contenedor.id}`);
      cita.posicion = {
        codigo: elegida.codigo,
        sugerida: r.mejor.codigo,
        puntaje: elegida.puntaje,
        decision: motivo ? 'modificada' : 'aceptada',
        motivo,
        decididaEn: decisionISO,
      };
      cita.actualizadaEn = decisionISO;
      patio = colocar(patio, elegida.coordenada, {
        contenedorId: contenedor.id,
        naveId,
        puerto,
        tramo: tramoPeso(pesoT),
      });
      evento({
        tipo: motivo ? 'posicion_modificada' : 'posicion_aceptada',
        citaId: id,
        en: decisionISO,
        detalle: motivo ? `${r.mejor.codigo} → ${elegida.codigo}` : elegida.codigo,
      });
    }
    if (estado === 'atendido') cita.atencion = { ...ATENCIONES[atendidas++] };
    citas.push(cita);
  });

  // Contenedores de las guías de ejemplo (todavía sin cita).
  contenedores.push(
    { id: EJEMPLOS.boliviano.contenedorId, naveId: 'N1', puerto: 'CNSHA', pesoT: 24.5, tipo: '40', guia: EJEMPLOS.boliviano.guia },
    { id: EJEMPLOS.nacional.contenedorId, naveId: 'N2', puerto: 'NLRTM', pesoT: 21.0, tipo: '40', guia: EJEMPLOS.nacional.guia },
  );

  return {
    version: VERSION_ESQUEMA,
    diaBase,
    revision: 0,
    actualizadoEn: decisionISO,
    puertos: PUERTOS,
    naves,
    conductores,
    contenedores,
    citas,
    patio,
    eventos,
    dispositivo: { consentimientoEn: null, conductorId: null, citaId: null },
    pendientes: [],
  };
}
