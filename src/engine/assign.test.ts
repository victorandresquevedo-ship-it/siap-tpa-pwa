import { describe, expect, it } from 'vitest';
import { PUNTAJE_MAXIMO, asignar, puntuarPosicion, urgencia, type ContenedorAsignable } from './assign';
import {
  BLOQUES,
  CAPACIDAD_BLOQUE,
  FILAS,
  NIVELES,
  colocar,
  crearBloqueVacio,
  formatoBaroti,
  parseBaroti,
  textoTramo,
  tramoPeso,
  type CargaEnPila,
  type Patio,
} from './yard';

const AHORA = '2026-10-16T10:00:00-03:00';
const enHoras = (h: number) => new Date(Date.parse(AHORA) + h * 3_600_000).toISOString();

function patioVacio(): Patio {
  return { bloques: BLOQUES.map((id, i) => crearBloqueVacio(id, 150 + i * 45)) };
}

let correlativo = 0;
function apilar(patio: Patio, bloque: number, bahia: number, fila: number, cargas: Omit<CargaEnPila, 'contenedorId'>[]) {
  let p = patio;
  cargas.forEach((c, i) => {
    p = colocar(p, { bloque, bahia, fila, nivel: i + 1 }, { contenedorId: `X${correlativo++}`, ...c });
  });
  return p;
}

/** Llena un bloque, pila por pila, hasta la cantidad indicada con carga de otra nave. */
function llenarBloque(patio: Patio, bloqueId: number, cantidad: number): Patio {
  let p = patio;
  for (let i = 0; i < cantidad; i++) {
    const pila = Math.floor(i / NIVELES);
    const bahia = Math.floor(pila / FILAS) + 1;
    const fila = (pila % FILAS) + 1;
    p = colocar(p, { bloque: bloqueId, bahia, fila, nivel: (i % NIVELES) + 1 }, {
      contenedorId: `R${correlativo++}`,
      naveId: 'OTRA',
      puerto: 'USLGB',
      tramo: 5,
    });
  }
  return p;
}

function congelar<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(congelar);
    Object.freeze(o);
  }
  return o;
}

const base: ContenedorAsignable = {
  id: 'TEST0000001',
  naveId: 'N1',
  naveNombre: 'Andes Express',
  puerto: 'CNSHA',
  puertoNombre: 'Shanghái',
  pesoT: 22,
  embarque: enHoras(30),
};
const N1_SHA = { naveId: 'N1', puerto: 'CNSHA' };

describe('coordenada Baroti y tramos de peso', () => {
  it('formatea bloque-bahía-fila-nivel con ceros', () => {
    expect(formatoBaroti({ bloque: 40, bahia: 12, fila: 3, nivel: 2 })).toBe('40-12-03-2');
  });

  it('lee una coordenada válida y rechaza las inválidas', () => {
    expect(parseBaroti('40-12-03-2')).toEqual({ bloque: 40, bahia: 12, fila: 3, nivel: 2 });
    expect(parseBaroti('45-12-03-2')).toBeNull();
    expect(parseBaroti('40-21-01-1')).toBeNull();
    expect(parseBaroti('40-12-03-6')).toBeNull();
  });

  it('agrupa el peso en tramos de 3 toneladas', () => {
    expect(tramoPeso(22)).toBe(7);
    expect(textoTramo(7)).toBe('21–24 t');
    expect(tramoPeso(2.9)).toBe(0);
  });

  it('la urgencia va de 1 (≤12 h) a 0 (≥72 h)', () => {
    expect(urgencia(6)).toBe(1);
    expect(urgencia(42)).toBe(0.5);
    expect(urgencia(100)).toBe(0);
  });
});

describe('motor de asignación', () => {
  it('es determinista y no modifica el patio de entrada', () => {
    const patio = congelar(apilar(patioVacio(), 70, 5, 1, [{ ...N1_SHA, tramo: 7 }]));
    const a = asignar({ contenedor: base, patio, ahora: AHORA });
    const b = asignar({ contenedor: base, patio, ahora: AHORA });
    expect(a).toEqual(b);
    expect(a.mejor).not.toBeNull();
  });

  it('el puntaje es la suma de los cinco criterios y cada uno trae su explicación', () => {
    expect(Object.values(PUNTAJE_MAXIMO).reduce((s, x) => s + x, 0)).toBe(100);
    const r = asignar({ contenedor: base, patio: patioVacio(), ahora: AHORA });
    for (const s of [r.mejor!, ...r.alternativas]) {
      expect(s.criterios.map((c) => c.clave)).toEqual(['nave', 'puerto', 'peso', 'embarque', 'distancia']);
      expect(s.criterios.reduce((t, c) => t + c.puntos, 0)).toBe(s.puntaje);
      for (const c of s.criterios) {
        expect(c.puntos).toBeGreaterThanOrEqual(0);
        expect(c.puntos).toBeLessThanOrEqual(c.max);
        expect(c.explicacion.length).toBeGreaterThan(10);
      }
    }
  });

  it('segrega por nave y destino: apila sobre la misma nave aunque esté más lejos', () => {
    const patio = apilar(patioVacio(), 70, 5, 1, [
      { ...N1_SHA, tramo: 7 },
      { ...N1_SHA, tramo: 7 },
    ]);
    const r = asignar({ contenedor: base, patio, ahora: AHORA });
    expect(r.mejor?.codigo).toBe('70-05-01-3');
  });

  it('nunca propone una pila con otra nave u otro destino', () => {
    let patio = apilar(patioVacio(), 10, 1, 1, [{ naveId: 'N2', puerto: 'CNSHA', tramo: 7 }]);
    patio = apilar(patio, 10, 1, 2, [{ naveId: 'N1', puerto: 'NLRTM', tramo: 7 }]);
    expect(puntuarPosicion({ contenedor: base, patio, ahora: AHORA }, 10, 1, 1)).toBeNull();
    expect(puntuarPosicion({ contenedor: base, patio, ahora: AHORA }, 10, 1, 2)).toBeNull();
    const r = asignar({ contenedor: base, patio, ahora: AHORA });
    for (const s of [r.mejor!, ...r.alternativas]) {
      expect(['10-01-01', '10-01-02']).not.toContain(s.codigo.slice(0, 8));
    }
  });

  it('evita bloques en mantención', () => {
    const patio = patioVacio();
    patio.bloques[0] = { ...patio.bloques[0], mantencion: true };
    const r = asignar({ contenedor: base, patio, ahora: AHORA });
    expect([r.mejor!, ...r.alternativas].map((s) => s.coordenada.bloque)).not.toContain(10);
    expect(r.descartados).toContainEqual(expect.objectContaining({ bloque: 10, motivo: 'mantencion' }));
  });

  it('evita bloques sobre 90% de ocupación, pero acepta uno justo en 90%', () => {
    let patio = llenarBloque(patioVacio(), 10, Math.ceil(CAPACIDAD_BLOQUE * 0.91));
    patio = llenarBloque(patio, 20, CAPACIDAD_BLOQUE * 0.9);
    const r = asignar({ contenedor: base, patio, ahora: AHORA });
    expect(r.descartados).toContainEqual(expect.objectContaining({ bloque: 10, motivo: 'ocupacion' }));
    expect(r.descartados.map((d) => d.bloque)).not.toContain(20);
    expect([r.mejor!, ...r.alternativas].map((s) => s.coordenada.bloque)).not.toContain(10);
  });

  it('embarque próximo va arriba; embarque lejano va abajo', () => {
    const patio = apilar(
      apilar(patioVacio(), 40, 7, 1, [{ ...N1_SHA, tramo: 7 }]),
      40, 7, 2,
      [{ ...N1_SHA, tramo: 7 }, { ...N1_SHA, tramo: 7 }, { ...N1_SHA, tramo: 7 }],
    );
    const urgente = asignar({ contenedor: { ...base, embarque: enHoras(6) }, patio, ahora: AHORA });
    const holgado = asignar({ contenedor: { ...base, embarque: enHoras(96) }, patio, ahora: AHORA });
    expect(urgente.prioridad).toBe('alta');
    expect(urgente.mejor?.codigo).toBe('40-07-02-4');
    expect(holgado.prioridad).toBe('baja');
    expect(holgado.mejor?.codigo).toBe('40-07-01-2');
  });

  it('con embarque próximo la distancia al frente de atraque pesa más', () => {
    const lejano = (h: number) =>
      puntuarPosicion({ contenedor: { ...base, embarque: enHoras(h) }, patio: patioVacio(), ahora: AHORA }, 90, 1, 1)!
        .criterios.find((c) => c.clave === 'distancia')!.puntos;
    const cercano = (h: number) =>
      puntuarPosicion({ contenedor: { ...base, embarque: enHoras(h) }, patio: patioVacio(), ahora: AHORA }, 10, 1, 1)!
        .criterios.find((c) => c.clave === 'distancia')!.puntos;
    expect(cercano(6) - lejano(6)).toBeGreaterThan(cercano(96) - lejano(96));
    const r = asignar({ contenedor: { ...base, embarque: enHoras(6) }, patio: patioVacio(), ahora: AHORA });
    expect(r.mejor?.coordenada.bloque).toBe(10);
  });

  it('prefiere la pila con el mismo tramo de peso', () => {
    let patio = apilar(patioVacio(), 40, 3, 1, [{ ...N1_SHA, tramo: 9 }]);
    patio = apilar(patio, 40, 3, 2, [{ ...N1_SHA, tramo: 4 }]);
    const r = asignar({ contenedor: { ...base, pesoT: 13 }, patio, ahora: AHORA });
    expect(r.mejor?.codigo).toBe('40-03-02-2');
  });

  it('entrega dos alternativas en bloques distintos y con puntaje menor o igual', () => {
    const patio = apilar(patioVacio(), 40, 7, 1, [{ ...N1_SHA, tramo: 7 }]);
    const r = asignar({ contenedor: base, patio, ahora: AHORA });
    expect(r.alternativas).toHaveLength(2);
    const bloques = [r.mejor!, ...r.alternativas].map((s) => s.coordenada.bloque);
    expect(new Set(bloques).size).toBe(3);
    for (const a of r.alternativas) expect(a.puntaje).toBeLessThanOrEqual(r.mejor!.puntaje);
  });

  it('si queda un solo bloque disponible, las alternativas van en otras bahías', () => {
    const patio = patioVacio();
    patio.bloques = patio.bloques.map((b) => (b.id === 50 ? b : { ...b, mantencion: true }));
    const r = asignar({ contenedor: base, patio, ahora: AHORA });
    expect(r.mejor?.coordenada.bloque).toBe(50);
    expect(r.alternativas).toHaveLength(2);
    const bahias = [r.mejor!, ...r.alternativas].map((s) => s.coordenada.bahia);
    expect(new Set(bahias).size).toBe(3);
  });

  it('sin bloques disponibles no sugiere nada y explica por qué', () => {
    const patio = patioVacio();
    patio.bloques = patio.bloques.map((b) => ({ ...b, mantencion: true }));
    const r = asignar({ contenedor: base, patio, ahora: AHORA });
    expect(r.mejor).toBeNull();
    expect(r.alternativas).toEqual([]);
    expect(r.descartados).toHaveLength(BLOQUES.length);
  });

  it('al recalcular ignora la posición actual del mismo contenedor', () => {
    const patio = apilar(patioVacio(), 40, 7, 1, [{ ...N1_SHA, tramo: 7 }]);
    const conEl = colocar(patio, { bloque: 90, bahia: 1, fila: 1, nivel: 1 }, { contenedorId: base.id, ...N1_SHA, tramo: 7 });
    expect(asignar({ contenedor: base, patio: conEl, ahora: AHORA })).toEqual(
      asignar({ contenedor: base, patio, ahora: AHORA }),
    );
  });

  it('puntuarPosicion coincide con la sugerencia del motor', () => {
    const patio = apilar(patioVacio(), 40, 7, 1, [{ ...N1_SHA, tramo: 7 }]);
    const entrada = { contenedor: base, patio, ahora: AHORA };
    const { mejor } = asignar(entrada);
    const { bloque, bahia, fila } = mejor!.coordenada;
    expect(puntuarPosicion(entrada, bloque, bahia, fila)).toEqual(mejor);
  });
});
