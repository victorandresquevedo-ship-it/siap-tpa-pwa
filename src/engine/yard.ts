// Modelo del patio de contenedores: bloques 10 a 90, cada uno con bahías × filas × niveles.
// Coordenada Baroti: bloque-bahía-fila-nivel, por ejemplo 40-12-03-2.

export const BLOQUES = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;
export const BAHIAS = 20;
export const FILAS = 6;
export const NIVELES = 5;
/** Tamaño del tramo de peso usado para segregar (toneladas). */
export const TRAMO_PESO_T = 3;
/** Sobre esta ocupación un bloque no recibe nuevas asignaciones. */
export const UMBRAL_OCUPACION = 0.9;

export interface CargaEnPila {
  contenedorId: string;
  naveId: string;
  puerto: string;
  tramo: number;
}

/** Una pila (bahía + fila). `carga[0]` es el nivel 1 (suelo). */
export interface Pila {
  bahia: number;
  fila: number;
  carga: CargaEnPila[];
}

export interface Bloque {
  id: number;
  mantencion: boolean;
  /** Distancia al frente de atraque, en metros. */
  distanciaM: number;
  /** BAHIAS × FILAS pilas, ordenadas por bahía y luego fila. */
  pilas: Pila[];
}

export interface Patio {
  bloques: Bloque[];
}

export interface Coordenada {
  bloque: number;
  bahia: number;
  fila: number;
  nivel: number;
}

export const CAPACIDAD_BLOQUE = BAHIAS * FILAS * NIVELES;

const dos = (n: number) => String(n).padStart(2, '0');

export function formatoBaroti(c: Coordenada): string {
  return `${c.bloque}-${dos(c.bahia)}-${dos(c.fila)}-${c.nivel}`;
}

export function parseBaroti(codigo: string): Coordenada | null {
  const m = /^(\d{2})-(\d{2})-(\d{2})-(\d)$/.exec(codigo.trim());
  if (!m) return null;
  const c = { bloque: +m[1], bahia: +m[2], fila: +m[3], nivel: +m[4] };
  const valida =
    (BLOQUES as readonly number[]).includes(c.bloque) &&
    c.bahia >= 1 && c.bahia <= BAHIAS &&
    c.fila >= 1 && c.fila <= FILAS &&
    c.nivel >= 1 && c.nivel <= NIVELES;
  return valida ? c : null;
}

export function tramoPeso(pesoT: number): number {
  return Math.floor(Math.max(0, pesoT) / TRAMO_PESO_T);
}

export function textoTramo(tramo: number): string {
  return `${tramo * TRAMO_PESO_T}–${(tramo + 1) * TRAMO_PESO_T} t`;
}

export function indicePila(bahia: number, fila: number): number {
  return (bahia - 1) * FILAS + (fila - 1);
}

export function contenedoresEnBloque(b: Bloque): number {
  let total = 0;
  for (const p of b.pilas) total += p.carga.length;
  return total;
}

/** Ocupación del bloque entre 0 y 1. */
export function ocupacionBloque(b: Bloque): number {
  return contenedoresEnBloque(b) / CAPACIDAD_BLOQUE;
}

export function crearBloqueVacio(id: number, distanciaM: number, mantencion = false): Bloque {
  const pilas: Pila[] = [];
  for (let bahia = 1; bahia <= BAHIAS; bahia++) {
    for (let fila = 1; fila <= FILAS; fila++) pilas.push({ bahia, fila, carga: [] });
  }
  return { id, distanciaM, mantencion, pilas };
}

/** Busca dónde está un contenedor en el patio. */
export function ubicarContenedor(patio: Patio, contenedorId: string): Coordenada | null {
  for (const b of patio.bloques) {
    for (const p of b.pilas) {
      const i = p.carga.findIndex((c) => c.contenedorId === contenedorId);
      if (i >= 0) return { bloque: b.id, bahia: p.bahia, fila: p.fila, nivel: i + 1 };
    }
  }
  return null;
}

/**
 * Devuelve un patio nuevo con el contenedor puesto en la pila de la coordenada.
 * El nivel real es la altura de la pila + 1 (no se puede dejar un contenedor "flotando").
 */
export function colocar(patio: Patio, coord: Coordenada, carga: CargaEnPila): Patio {
  return {
    bloques: patio.bloques.map((b) => {
      if (b.id !== coord.bloque) return b;
      const idx = indicePila(coord.bahia, coord.fila);
      const pila = b.pilas[idx];
      if (pila.carga.length >= NIVELES) throw new Error(`La pila ${formatoBaroti(coord)} está llena`);
      const pilas = b.pilas.slice();
      pilas[idx] = { ...pila, carga: [...pila.carga, carga] };
      return { ...b, pilas };
    }),
  };
}

/** Devuelve un patio nuevo sin el contenedor (si estaba). */
export function retirar(patio: Patio, contenedorId: string): Patio {
  const donde = ubicarContenedor(patio, contenedorId);
  if (!donde) return patio;
  return {
    bloques: patio.bloques.map((b) => {
      if (b.id !== donde.bloque) return b;
      const idx = indicePila(donde.bahia, donde.fila);
      const pilas = b.pilas.slice();
      pilas[idx] = { ...pilas[idx], carga: pilas[idx].carga.filter((c) => c.contenedorId !== contenedorId) };
      return { ...b, pilas };
    }),
  };
}
