// Motor de asignación de posiciones en el patio. Función pura y determinista:
// mismas entradas => misma salida. No usa Date.now() ni números aleatorios;
// el momento de cálculo llega como dato (`ahora`).
//
// Reglas (en orden de importancia):
//  1. Segrega por nave, luego por puerto de destino y luego por peso (tramos de 3 t).
//     Una pila solo recibe contenedores de la misma nave y el mismo puerto.
//  2. Los embarques más próximos van más cerca del frente de atraque y en niveles superiores.
//  3. Nunca usa bloques en mantención ni bloques sobre 90% de ocupación.

import {
  BAHIAS,
  NIVELES,
  UMBRAL_OCUPACION,
  formatoBaroti,
  ocupacionBloque,
  retirar,
  textoTramo,
  tramoPeso,
  type Bloque,
  type Coordenada,
  type Patio,
  type Pila,
} from './yard';

export interface ContenedorAsignable {
  id: string;
  naveId: string;
  /** Nombre para las frases explicativas (opcional). */
  naveNombre?: string;
  /** Código del puerto de destino (UN/LOCODE). */
  puerto: string;
  puertoNombre?: string;
  pesoT: number;
  /** Fecha y hora de embarque (ISO 8601). */
  embarque: string;
}

export interface EntradaAsignacion {
  contenedor: ContenedorAsignable;
  patio: Patio;
  /** Momento del cálculo (ISO 8601). */
  ahora: string;
}

export type ClaveCriterio = 'nave' | 'puerto' | 'peso' | 'embarque' | 'distancia';

export const PUNTAJE_MAXIMO: Record<ClaveCriterio, number> = {
  nave: 30,
  puerto: 20,
  peso: 15,
  embarque: 20,
  distancia: 15,
};

export const ETIQUETA_CRITERIO: Record<ClaveCriterio, string> = {
  nave: 'Nave',
  puerto: 'Puerto de destino',
  peso: 'Peso',
  embarque: 'Fecha de embarque',
  distancia: 'Distancia al frente de atraque',
};

export interface Criterio {
  clave: ClaveCriterio;
  etiqueta: string;
  puntos: number;
  max: number;
  explicacion: string;
}

export interface Sugerencia {
  coordenada: Coordenada;
  /** Coordenada Baroti, por ejemplo 40-12-03-2. */
  codigo: string;
  /** Suma de los puntos de los criterios (0 a 100). */
  puntaje: number;
  criterios: Criterio[];
}

export type MotivoDescarte = 'mantencion' | 'ocupacion' | 'sin_pila_compatible';

export interface BloqueDescartado {
  bloque: number;
  motivo: MotivoDescarte;
  detalle: string;
}

export type Prioridad = 'alta' | 'media' | 'baja';

export interface ResultadoAsignacion {
  mejor: Sugerencia | null;
  /** Hasta dos alternativas, idealmente en bloques distintos al de la mejor. */
  alternativas: Sugerencia[];
  descartados: BloqueDescartado[];
  horasAlEmbarque: number;
  prioridad: Prioridad;
  /** Cantidad de pilas evaluadas. */
  evaluadas: number;
}

/** Bajo este plazo el embarque es de prioridad máxima. */
const HORAS_URGENTE = 12;
/** Sobre este plazo el embarque no tiene urgencia. */
const HORAS_HOLGADO = 72;

/** Urgencia del embarque entre 0 (holgado) y 1 (inminente). */
export function urgencia(horas: number): number {
  if (horas <= HORAS_URGENTE) return 1;
  if (horas >= HORAS_HOLGADO) return 0;
  return (HORAS_HOLGADO - horas) / (HORAS_HOLGADO - HORAS_URGENTE);
}

export function prioridad(u: number): Prioridad {
  if (u >= 2 / 3) return 'alta';
  if (u >= 1 / 3) return 'media';
  return 'baja';
}

function textoPlazo(horas: number): string {
  if (horas < 0) return 'embarque ya vencido';
  if (horas < 48) return `${Math.round(horas)} h`;
  return `${Math.round(horas / 24)} días`;
}

const porcentaje = (x: number) => `${Math.round(x * 100)}%`;

/** Datos de un bloque que se calculan una vez por contenedor. */
interface ContextoBloque {
  bloque: Bloque;
  bloqueTieneNave: boolean;
  bloqueTieneDestino: boolean;
  bahiaTieneNave: boolean[];
  bahiaTieneDestino: boolean[];
  bahiaVacia: boolean[];
}

interface ContextoGeneral {
  contenedor: ContenedorAsignable;
  tramo: number;
  horas: number;
  u: number;
  dMin: number;
  dMax: number;
}

function contextoBloque(b: Bloque, c: ContenedorAsignable): ContextoBloque {
  const bahiaTieneNave = new Array<boolean>(BAHIAS + 1).fill(false);
  const bahiaTieneDestino = new Array<boolean>(BAHIAS + 1).fill(false);
  const bahiaVacia = new Array<boolean>(BAHIAS + 1).fill(true);
  for (const p of b.pilas) {
    for (const carga of p.carga) {
      bahiaVacia[p.bahia] = false;
      if (carga.naveId === c.naveId) {
        bahiaTieneNave[p.bahia] = true;
        if (carga.puerto === c.puerto) bahiaTieneDestino[p.bahia] = true;
      }
    }
  }
  return {
    bloque: b,
    bloqueTieneNave: bahiaTieneNave.some(Boolean),
    bloqueTieneDestino: bahiaTieneDestino.some(Boolean),
    bahiaTieneNave,
    bahiaTieneDestino,
    bahiaVacia,
  };
}

/** Una pila puede recibir el contenedor si tiene espacio y solo carga de la misma nave y puerto. */
function pilaCompatible(p: Pila, c: ContenedorAsignable): boolean {
  if (p.carga.length >= NIVELES) return false;
  return p.carga.every((x) => x.naveId === c.naveId && x.puerto === c.puerto);
}

function evaluar(p: Pila, cb: ContextoBloque, g: ContextoGeneral): Sugerencia {
  const { contenedor: c, tramo, horas, u } = g;
  const b = cb.bloque;
  const nave = c.naveNombre ?? c.naveId;
  const destino = c.puertoNombre ?? c.puerto;
  const nivel = p.carga.length + 1;
  const criterios: Criterio[] = [];
  const agregar = (clave: ClaveCriterio, fraccion: number, explicacion: string) =>
    criterios.push({
      clave,
      etiqueta: ETIQUETA_CRITERIO[clave],
      puntos: Math.round(PUNTAJE_MAXIMO[clave] * fraccion),
      max: PUNTAJE_MAXIMO[clave],
      explicacion,
    });

  // 1. Nave
  if (cb.bahiaTieneNave[p.bahia]) {
    agregar('nave', 1, `La bahía ${p.bahia} ya agrupa contenedores de ${nave}: se embarcan juntos.`);
  } else if (cb.bahiaVacia[p.bahia] && cb.bloqueTieneNave) {
    agregar('nave', 0.6, `Bahía ${p.bahia} libre, junto a otros contenedores de ${nave} en el bloque ${b.id}.`);
  } else if (cb.bahiaVacia[p.bahia]) {
    agregar('nave', 1 / 3, `Bahía ${p.bahia} libre: abre un grupo nuevo para ${nave}.`);
  } else {
    agregar('nave', 0, `La bahía ${p.bahia} tiene otras naves: mezcla la segregación.`);
  }

  // 2. Puerto de destino
  if (p.carga.length > 0) {
    agregar('puerto', 1, `Se apila sobre contenedores con el mismo destino (${destino}).`);
  } else if (cb.bahiaTieneDestino[p.bahia]) {
    agregar('puerto', 0.7, `En la bahía hay otras pilas con destino ${destino}.`);
  } else if (cb.bloqueTieneDestino) {
    agregar('puerto', 0.4, `El bloque tiene contenedores a ${destino}, en otra bahía.`);
  } else {
    agregar('puerto', 0.2, `Primer contenedor a ${destino} en esta zona.`);
  }

  // 3. Peso (tramos de 3 t; el más pesado arriba se embarca primero)
  const tope = p.carga.at(-1);
  if (!tope) {
    agregar('peso', 2 / 3, `Pila nueva: parte con el tramo ${textoTramo(tramo)}.`);
  } else if (tope.tramo === tramo) {
    agregar('peso', 1, `Mismo tramo de peso que la pila (${textoTramo(tramo)}).`);
  } else if (tramo > tope.tramo) {
    agregar('peso', 11 / 15, `Más pesado que el de abajo (${textoTramo(tope.tramo)}): sale primero, sin remanejo.`);
  } else if (tope.tramo - tramo === 1) {
    agregar('peso', 4 / 15, `Un tramo más liviano que el de abajo (${textoTramo(tope.tramo)}): puede requerir remanejo.`);
  } else {
    agregar('peso', 0, `Mucho más liviano que el de abajo (${textoTramo(tope.tramo)}): obligaría a remanejar.`);
  }

  // 4. Fecha de embarque: lo próximo arriba, lo lejano abajo
  const nivelRelativo = (nivel - 1) / (NIVELES - 1);
  const ajusteNivel = 1 - Math.abs(nivelRelativo - u);
  const arriba = nivelRelativo >= 0.5;
  const lectura =
    u >= 0.5
      ? arriba ? 'arriba, se saca rápido' : 'abajo, costará más sacarlo'
      : arriba ? 'arriba, ocupa el lugar de lo más urgente' : 'abajo, deja arriba lo más urgente';
  agregar(
    'embarque',
    ajusteNivel,
    `Embarque en ${textoPlazo(horas)} (prioridad ${prioridad(u)}): nivel ${nivel} de ${NIVELES}, ${lectura}.`,
  );

  // 5. Distancia al frente de atraque: pesa más mientras más próximo el embarque
  const peso = 0.3 + 0.7 * u;
  const dNorm = g.dMax === g.dMin ? 0 : (b.distanciaM - g.dMin) / (g.dMax - g.dMin);
  agregar(
    'distancia',
    (1 - dNorm) * peso + 0.5 * (1 - peso),
    `Bloque ${b.id} a ${b.distanciaM} m del frente de atraque; ${
      u >= 0.5 ? 'con embarque próximo la cercanía pesa más' : 'con embarque lejano la distancia pesa menos'
    }.`,
  );

  const coordenada = { bloque: b.id, bahia: p.bahia, fila: p.fila, nivel };
  return {
    coordenada,
    codigo: formatoBaroti(coordenada),
    puntaje: criterios.reduce((s, x) => s + x.puntos, 0),
    criterios,
  };
}

/** Orden total: mayor puntaje primero; empates por bloque, bahía y fila menores. */
function comparar(a: Sugerencia, b: Sugerencia): number {
  return (
    b.puntaje - a.puntaje ||
    a.coordenada.bloque - b.coordenada.bloque ||
    a.coordenada.bahia - b.coordenada.bahia ||
    a.coordenada.fila - b.coordenada.fila
  );
}

/** Dos alternativas en bloques distintos; si no alcanza, en bahías distintas. */
function elegirAlternativas(ordenados: Sugerencia[]): Sugerencia[] {
  const [mejor, ...resto] = ordenados;
  if (!mejor) return [];
  const alternativas: Sugerencia[] = [];
  const bloques = new Set([mejor.coordenada.bloque]);
  for (const s of resto) {
    if (alternativas.length === 2) break;
    if (!bloques.has(s.coordenada.bloque)) {
      alternativas.push(s);
      bloques.add(s.coordenada.bloque);
    }
  }
  if (alternativas.length < 2) {
    const clave = (s: Sugerencia) => `${s.coordenada.bloque}-${s.coordenada.bahia}`;
    const bahias = new Set([mejor, ...alternativas].map(clave));
    for (const s of resto) {
      if (alternativas.length === 2) break;
      if (!bahias.has(clave(s))) {
        alternativas.push(s);
        bahias.add(clave(s));
      }
    }
  }
  return alternativas.sort(comparar);
}

function contextoGeneral(entrada: EntradaAsignacion, patio: Patio): ContextoGeneral {
  const { contenedor, ahora } = entrada;
  const horas = (Date.parse(contenedor.embarque) - Date.parse(ahora)) / 3_600_000;
  if (!Number.isFinite(horas)) throw new Error('Fecha de embarque o momento de cálculo inválidos');
  const distancias = patio.bloques.map((b) => b.distanciaM);
  return {
    contenedor,
    tramo: tramoPeso(contenedor.pesoT),
    horas,
    u: urgencia(horas),
    dMin: Math.min(...distancias),
    dMax: Math.max(...distancias),
  };
}

/**
 * Calcula la mejor posición, dos alternativas y el desglose del puntaje.
 * Si el contenedor ya está en el patio (recálculo), se ignora su posición actual.
 */
export function asignar(entrada: EntradaAsignacion): ResultadoAsignacion {
  const patio = retirar(entrada.patio, entrada.contenedor.id);
  const g = contextoGeneral(entrada, patio);
  const descartados: BloqueDescartado[] = [];
  const candidatos: Sugerencia[] = [];

  for (const b of [...patio.bloques].sort((x, y) => x.id - y.id)) {
    if (b.mantencion) {
      descartados.push({ bloque: b.id, motivo: 'mantencion', detalle: `Bloque ${b.id} en mantención.` });
      continue;
    }
    const ocupacion = ocupacionBloque(b);
    if (ocupacion > UMBRAL_OCUPACION) {
      descartados.push({
        bloque: b.id,
        motivo: 'ocupacion',
        detalle: `Bloque ${b.id} al ${porcentaje(ocupacion)} de ocupación (límite ${porcentaje(UMBRAL_OCUPACION)}).`,
      });
      continue;
    }
    const cb = contextoBloque(b, g.contenedor);
    const antes = candidatos.length;
    for (const p of b.pilas) {
      if (pilaCompatible(p, g.contenedor)) candidatos.push(evaluar(p, cb, g));
    }
    if (candidatos.length === antes) {
      descartados.push({
        bloque: b.id,
        motivo: 'sin_pila_compatible',
        detalle: `Bloque ${b.id} sin pilas libres para esta nave y destino.`,
      });
    }
  }

  candidatos.sort(comparar);
  return {
    mejor: candidatos[0] ?? null,
    alternativas: elegirAlternativas(candidatos),
    descartados,
    horasAlEmbarque: g.horas,
    prioridad: prioridad(g.u),
    evaluadas: candidatos.length,
  };
}

/**
 * Puntúa una posición elegida a mano (por ejemplo, cuando el planificador modifica).
 * Devuelve null si la pila no puede recibir el contenedor o el bloque no está disponible.
 */
export function puntuarPosicion(
  entrada: EntradaAsignacion,
  bloqueId: number,
  bahia: number,
  fila: number,
): Sugerencia | null {
  const patio = retirar(entrada.patio, entrada.contenedor.id);
  const b = patio.bloques.find((x) => x.id === bloqueId);
  if (!b || b.mantencion || ocupacionBloque(b) > UMBRAL_OCUPACION) return null;
  const p = b.pilas.find((x) => x.bahia === bahia && x.fila === fila);
  if (!p || !pilaCompatible(p, entrada.contenedor)) return null;
  return evaluar(p, contextoBloque(b, entrada.contenedor), contextoGeneral(entrada, patio));
}
