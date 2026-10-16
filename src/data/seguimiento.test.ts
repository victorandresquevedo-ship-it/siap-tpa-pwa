import { describe, expect, it } from 'vitest';
import { asignar } from '../engine/assign';
import { parseBaroti, ubicarContenedor } from '../engine/yard';
import {
  MINUTOS_EMBARQUE_ADELANTADO,
  adelantarEmbarque,
  aceptarConsentimiento,
  decidirPosicion,
  elegirConductor,
  marcarAvisosVistos,
  registrarHito,
  reprogramarCita,
  reservarCita,
  responderEncuesta,
} from './acciones';
import { enDia, fechaISO } from './fechas';
import { franjasDelDia } from './franjas';
import { EJEMPLOS, contenedorAsignable, crearEstadoDemo } from './seed';
import { lugarEnFila, textoMotivoTiempo, tiempoVigente } from './seguimiento';
import type { DemoState } from './types';

const AHORA = new Date(2026, 9, 16, 10, 0);
const MANANA = fechaISO(enDia(AHORA, 1, 0));
const { conductorId, contenedorId } = EJEMPLOS.boliviano;

/** El conductor boliviano reserva mañana a las 10:00 (historia de la demo). */
function conReserva() {
  let e = crearEstadoDemo(AHORA);
  e = aceptarConsentimiento(e, AHORA).estado;
  e = elegirConductor(e, conductorId).estado;
  return reservarCita(e, { contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA);
}

function sugerencia(e: DemoState, citaId: string) {
  const cita = e.citas.find((c) => c.id === citaId)!;
  const contenedor = e.contenedores.find((c) => c.id === cita.contenedorId)!;
  return asignar({ contenedor: contenedorAsignable(e, contenedor), patio: e.patio, ahora: AHORA.toISOString() });
}

/** Planificador acepta la sugerencia del motor. */
function conPosicion() {
  const { estado, resultado } = conReserva();
  const r = sugerencia(estado, resultado.id);
  return decidirPosicion(estado, resultado.id, { codigo: r.mejor!.codigo, sugerida: r.mejor!.codigo, puntaje: r.mejor!.puntaje }, AHORA);
}

describe('tiempo estimado y lugar en la fila', () => {
  it('al reservar, el tiempo estimado es la espera que se mostró en la franja', () => {
    const antes = franjasDelDia(crearEstadoDemo(AHORA), MANANA, { ahora: AHORA }).find((f) => f.hora === 10)!;
    const { resultado } = conReserva();
    expect(tiempoVigente(resultado)).toMatchObject({ minutos: antes.esperaMin, delta: 0 });
    expect(textoMotivoTiempo(tiempoVigente(resultado)!)).toMatch(/ocupación de tu franja/);
  });

  it('la cita nueva queda al final de la fila de su franja', () => {
    const { estado, resultado } = conReserva();
    expect(lugarEnFila(estado, resultado)).toEqual({ lugar: 3, total: 3 });
  });

  it('al reprogramar, el tiempo cambia con su motivo y la cita pasa al final de la nueva franja', () => {
    const { estado } = conReserva();
    const { estado: e2, resultado } = reprogramarCita(estado, 'C026', MANANA, 11, enDia(AHORA, 0, 10, 5));
    const t = tiempoVigente(resultado)!;
    expect(t.motivo).toMatch(/^Reprogramaste a 11:00–12:00/);
    expect(t.delta).toBe(t.minutos - resultado.tiempoEstimado[0].minutos);
    const fila = lugarEnFila(e2, resultado);
    expect(fila.lugar).toBe(fila.total);
  });

  it('el texto del motivo lleva el signo del cambio', () => {
    expect(textoMotivoTiempo({ en: '', minutos: 17, delta: 6, motivo: 'X adelantó su embarque' })).toBe(
      '+6 min: X adelantó su embarque',
    );
    expect(textoMotivoTiempo({ en: '', minutos: 9, delta: -2, motivo: 'Y' })).toBe('−2 min: Y');
  });
});

describe('posición decidida por el planificador', () => {
  it('al aceptar, el contenedor queda en el patio y el conductor recibe un aviso', () => {
    const { estado, resultado } = conPosicion();
    expect(resultado.posicion).toMatchObject({ decision: 'aceptada' });
    expect(ubicarContenedor(estado.patio, contenedorId)).toEqual(parseBaroti(resultado.posicion!.codigo));
    expect(resultado.avisos).toEqual([expect.objectContaining({ titulo: 'Ya tienes posición en el patio', visto: false })]);
    expect(resultado.posicion!.codigo.startsWith('40-')).toBe(true);
  });

  it('si la posición cambia, avisa con el motivo y ajusta el tiempo si cambió de bloque', () => {
    const { estado, resultado } = conPosicion();
    const r = sugerencia(estado, resultado.id);
    const otra = r.alternativas.find((a) => a.coordenada.bloque !== 40)!;
    const cambio = decidirPosicion(
      estado,
      resultado.id,
      { codigo: otra.codigo, sugerida: r.mejor!.codigo, puntaje: otra.puntaje, motivo: 'bloque_lleno' },
      AHORA,
    );
    const cita = cambio.resultado;
    expect(cita.posicion).toMatchObject({ decision: 'modificada', motivo: 'bloque_lleno', codigo: otra.codigo });
    expect(cita.avisos.at(-1)).toMatchObject({ titulo: 'Cambió tu posición' });
    expect(cita.avisos.at(-1)!.detalle).toMatch(/Motivo: Bloque lleno/);
    expect(tiempoVigente(cita)!.motivo).toMatch(new RegExp(`bloque ${otra.coordenada.bloque}`));
    // El contenedor está una sola vez en el patio, en la posición nueva.
    expect(ubicarContenedor(cambio.estado.patio, contenedorId)).toEqual(otra.coordenada);
  });

  it('rechaza bloques en mantención y pilas de otra nave', () => {
    const { estado, resultado } = conReserva();
    expect(() => decidirPosicion(estado, resultado.id, { codigo: '20-01-01-1', sugerida: 'x', puntaje: 0 }, AHORA)).toThrow(
      /mantención/,
    );
    // Bahía 13 del bloque 40 es de Pacífico Sur → Long Beach.
    const pilaAjena = estado.patio.bloques.find((b) => b.id === 40)!.pilas.find((p) => p.bahia === 13 && p.carga.length > 0 && p.carga.length < 5)!;
    const codigo = `40-13-0${pilaAjena.fila}-${pilaAjena.carga.length + 1}`;
    expect(() => decidirPosicion(estado, resultado.id, { codigo, sugerida: 'x', puntaje: 0 }, AHORA)).toThrow(/otra nave/);
  });
});

describe('hitos del camión', () => {
  it('avanza en orden y no retrocede', () => {
    const { estado } = conPosicion();
    const e1 = registrarHito(estado, 'C026', 'antepuerto', AHORA).estado;
    expect(() => registrarHito(e1, 'C026', 'en_ruta', AHORA)).toThrow(/ya está "En antepuerto"/);
  });

  it('no deja entrar por garita sin posición asignada', () => {
    const { estado } = conReserva();
    expect(() => registrarHito(estado, 'C026', 'garita', AHORA)).toThrow(/asignar la posición/);
  });

  it('al ser atendido guarda los minutos y si fue dentro de la franja; luego acepta la encuesta', () => {
    const { estado, resultado } = conPosicion();
    expect(() => responderEncuesta(estado, 'C026', 5, AHORA)).toThrow(/después de la atención/);
    const atendida = registrarHito(estado, 'C026', 'atendido', AHORA, { dentroDeFranja: false });
    expect(atendida.resultado.atencion).toEqual({ minutos: tiempoVigente(resultado)!.minutos, dentroDeFranja: false });
    const conNota = responderEncuesta(atendida.estado, 'C026', 4, AHORA).estado;
    expect(conNota.citas.find((c) => c.id === 'C026')!.atencion!.encuesta).toBe(4);
  });
});

describe('nave adelanta su embarque', () => {
  it(`suma ${MINUTOS_EMBARQUE_ADELANTADO} min con su motivo a los camiones pendientes de esa nave`, () => {
    const { estado, resultado } = conPosicion();
    const antes = tiempoVigente(resultado)!.minutos;
    const { estado: e2, resultado: afectadas } = adelantarEmbarque(estado, 'N1', 12, AHORA);
    const cita = e2.citas.find((c) => c.id === 'C026')!;
    expect(tiempoVigente(cita)).toMatchObject({ minutos: antes + 6, delta: 6 });
    expect(textoMotivoTiempo(tiempoVigente(cita)!)).toBe('+6 min: Andes Express adelantó su embarque y el patio prioriza su carga');
    expect(afectadas).toBeGreaterThan(1);
    // Nave adelantada 12 h; atendidos y otras naves no cambian.
    const n1 = (s: DemoState) => Date.parse(s.naves.find((n) => n.id === 'N1')!.embarque);
    expect(n1(estado) - n1(e2)).toBe(12 * 3_600_000);
    const atendida = estado.citas.find((c) => c.estado === 'atendido')!;
    expect(e2.citas.find((c) => c.id === atendida.id)).toEqual(atendida);
    const otraNave = estado.citas.find((c) => c.id === 'C002')!; // Altiplano Star
    expect(e2.citas.find((c) => c.id === 'C002')).toEqual(otraNave);
  });
});

describe('avisos', () => {
  it('"Entendido" deja los avisos como vistos', () => {
    const { estado } = conPosicion();
    const e2 = marcarAvisosVistos(estado, 'C026').estado;
    expect(e2.citas.find((c) => c.id === 'C026')!.avisos.every((a) => a.visto)).toBe(true);
  });
});

