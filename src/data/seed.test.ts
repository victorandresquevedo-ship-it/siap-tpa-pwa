import { describe, expect, it } from 'vitest';
import { asignar } from '../engine/assign';
import { BLOQUES, UMBRAL_OCUPACION, ocupacionBloque, parseBaroti, ubicarContenedor } from '../engine/yard';
import { EJEMPLOS, contenedorAsignable, crearEstadoDemo, sigla, siglaValida } from './seed';

const DIA = new Date(2026, 9, 16, 9, 30);

describe('datos de ejemplo', () => {
  const estado = crearEstadoDemo(DIA);

  it('tiene el tamaño pedido: 25 citas, 4 naves, 9 bloques', () => {
    expect(estado.citas).toHaveLength(25);
    expect(estado.naves).toHaveLength(4);
    expect(estado.patio.bloques.map((b) => b.id)).toEqual([...BLOQUES]);
    expect(new Set(estado.puertos.map((p) => p.region))).toEqual(new Set(['Asia', 'Europa', 'EE.UU.']));
    expect(new Set(estado.conductores.map((c) => c.nacionalidad))).toEqual(new Set(['CL', 'BO']));
  });

  it('es reproducible: mismo día, mismos datos', () => {
    expect(crearEstadoDemo(new Date(2026, 9, 16, 18, 0))).toEqual(estado);
  });

  it('las siglas de contenedor tienen dígito de control ISO 6346 válido', () => {
    expect(sigla('CSQU', 305438)).toBe('CSQU3054383'); // ejemplo clásico de la norma
    for (const c of estado.contenedores) expect(siglaValida(c.id)).toBe(true);
  });

  it('tiene un bloque en mantención y otro sobre 90%', () => {
    expect(estado.patio.bloques.filter((b) => b.mantencion)).toHaveLength(1);
    expect(estado.patio.bloques.some((b) => ocupacionBloque(b) > UMBRAL_OCUPACION)).toBe(true);
  });

  it('ninguna pila mezcla naves o destinos', () => {
    for (const b of estado.patio.bloques) {
      for (const p of b.pilas) {
        const claves = new Set(p.carga.map((c) => `${c.naveId}/${c.puerto}`));
        expect(claves.size).toBeLessThanOrEqual(1);
      }
    }
  });

  it('cada posición decidida está en el patio, en esa coordenada', () => {
    const decididas = estado.citas.filter((c) => c.posicion);
    expect(decididas.length).toBeGreaterThan(10);
    for (const cita of decididas) {
      expect(ubicarContenedor(estado.patio, cita.contenedorId)).toEqual(parseBaroti(cita.posicion!.codigo));
    }
  });

  it('la guía de ejemplo boliviana cae en el bloque 40 (historia de la demo)', () => {
    const c = estado.contenedores.find((x) => x.id === EJEMPLOS.boliviano.contenedorId)!;
    const r = asignar({ contenedor: contenedorAsignable(estado, c), patio: estado.patio, ahora: DIA.toISOString() });
    expect(r.mejor?.coordenada.bloque).toBe(40);
  });
});
