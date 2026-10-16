import { describe, expect, it } from 'vitest';
import {
  ErrorDemo,
  aceptarConsentimiento,
  borrarMisDatos,
  elegirConductor,
  reprogramarCita,
  reservarCita,
} from './acciones';
import { enDia, fechaISO } from './fechas';
import { franjasDelDia } from './franjas';
import { EJEMPLOS, crearEstadoDemo } from './seed';

const AHORA = new Date(2026, 9, 16, 10, 0);
const HOY = fechaISO(AHORA);
const MANANA = fechaISO(enDia(AHORA, 1, 0));
const { conductorId, contenedorId } = EJEMPLOS.boliviano;

function preparado() {
  let estado = crearEstadoDemo(AHORA);
  estado = aceptarConsentimiento(estado, AHORA).estado;
  estado = elegirConductor(estado, conductorId).estado;
  return estado;
}

describe('reserva de cita', () => {
  it('crea una cita pendiente de posición y la deja como cita de este teléfono', () => {
    const { estado, resultado } = reservarCita(preparado(), { contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA);
    expect(resultado).toMatchObject({ id: 'C026', estado: 'reservada', posicion: null, fecha: MANANA, franja: 10 });
    expect(estado.citas).toHaveLength(26);
    expect(estado.dispositivo.citaId).toBe('C026');
    expect(estado.eventos.at(-1)).toMatchObject({ tipo: 'cita_reservada', citaId: 'C026' });
  });

  it('la nueva cita ocupa un cupo de la franja', () => {
    const antes = preparado();
    const { estado } = reservarCita(antes, { contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA);
    const cupos = (s: typeof antes) => franjasDelDia(s, MANANA, { ahora: AHORA }).find((f) => f.hora === 10)!.libres;
    expect(cupos(estado)).toBe(cupos(antes) - 1);
  });

  it('no permite reservar dos veces el mismo contenedor', () => {
    const { estado } = reservarCita(preparado(), { contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA);
    expect(() => reservarCita(estado, { contenedorId, conductorId, fecha: MANANA, franja: 11 }, AHORA)).toThrow(
      /ya tiene la cita C026/,
    );
  });

  it('no permite reservar un contenedor que ya fue recibido en el patio', () => {
    const e = preparado();
    const atendida = e.citas.find((c) => c.estado === 'atendido')!;
    expect(() =>
      reservarCita(e, { contenedorId: atendida.contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA),
    ).toThrow(/ya fue recibido/);
  });

  it('no permite franjas completas, pasadas ni después del cierre de la nave', () => {
    const e = preparado();
    const reservar = (fecha: string, franja: number) =>
      reservarCita(e, { contenedorId, conductorId, fecha, franja }, AHORA);
    expect(() => reservar(HOY, 13)).toThrow(/no tiene cupos/);
    expect(() => reservar(HOY, 9)).toThrow(/ya pasó/);
    // Andes Express embarca pasado mañana a las 08:00: la recepción cierra a las 02:00.
    expect(() => reservar(fechaISO(enDia(AHORA, 2, 0)), 8)).toThrow(/cierre de recepción/);
    expect(() => reservar(HOY, 13)).toThrow(ErrorDemo);
  });
});

describe('reprogramar', () => {
  it('cambia la franja, cuenta la reprogramación y deja registro', () => {
    const { estado: conCita } = reservarCita(preparado(), { contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA);
    const { estado, resultado } = reprogramarCita(conCita, 'C026', MANANA, 18, AHORA);
    expect(resultado).toMatchObject({ franja: 18, reprogramaciones: 1 });
    expect(estado.citas.find((c) => c.id === 'C026')?.franja).toBe(18);
    expect(estado.eventos.at(-1)?.tipo).toBe('cita_reprogramada');
  });

  it('pide un horario distinto al actual', () => {
    const { estado } = reservarCita(preparado(), { contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA);
    expect(() => reprogramarCita(estado, 'C026', MANANA, 10, AHORA)).toThrow(/distinto/);
  });

  it('no reprograma una cita ya atendida', () => {
    const atendida = preparado().citas.find((c) => c.estado === 'atendido')!;
    expect(() => reprogramarCita(preparado(), atendida.id, MANANA, 10, AHORA)).toThrow(/atendida/);
  });
});

describe('datos del teléfono', () => {
  it('al elegir conductor recupera su cita activa', () => {
    const { estado: conCita } = reservarCita(preparado(), { contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA);
    const otro = elegirConductor(conCita, EJEMPLOS.nacional.conductorId).estado;
    expect(otro.dispositivo.citaId).toBeNull();
    expect(elegirConductor(otro, conductorId).estado.dispositivo.citaId).toBe('C026');
  });

  it('"Borrar mis datos" deja el teléfono sin consentimiento, identidad ni cita', () => {
    const { estado } = borrarMisDatos(preparado());
    expect(estado.dispositivo).toEqual({ consentimientoEn: null, conductorId: null, citaId: null });
  });
});
