import { describe, expect, it } from 'vitest';
import { enDia, fechaISO } from './fechas';
import { cierreRecepcion, esperaEstimada, franjasDelDia, nivelCupos } from './franjas';
import { crearEstadoDemo } from './seed';

const HOY = new Date(2026, 9, 16, 10, 0);
const estado = crearEstadoDemo(HOY);
const hoy = fechaISO(HOY);
const manana = fechaISO(enDia(HOY, 1, 0));
const nave = (id: string) => estado.naves.find((n) => n.id === id)!;

describe('franjas y cupos', () => {
  it('hay 12 franjas de 1 hora, de 08:00 a 20:00', () => {
    const f = franjasDelDia(estado, manana, { ahora: HOY });
    expect(f.map((x) => x.hora)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  });

  it('semáforo de cupos: verde con 4 o más, amarillo con 1 a 3, rojo sin cupos', () => {
    expect(nivelCupos(6)).toBe('verde');
    expect(nivelCupos(4)).toBe('verde');
    expect(nivelCupos(2)).toBe('amarillo');
    expect(nivelCupos(0)).toBe('rojo');
  });

  it('la espera estimada sube con la ocupación y llega a 42 min con la franja llena', () => {
    expect(esperaEstimada(2)).toBeLessThan(esperaEstimada(6));
    expect(esperaEstimada(9)).toBe(42);
  });

  it('las franjas que ya pasaron no se pueden reservar', () => {
    const f = franjasDelDia(estado, hoy, { ahora: HOY });
    expect(f.filter((x) => x.hora <= 10).every((x) => x.motivo === 'pasada')).toBe(true);
    expect(f.find((x) => x.hora === 11)?.motivo).not.toBe('pasada');
  });

  it('hoy el horario punta está lleno y la recomendada queda fuera de 12:00–17:00', () => {
    const f = franjasDelDia(estado, hoy, { ahora: HOY });
    expect(f.find((x) => x.hora === 13)?.motivo).toBe('completa');
    const rec = f.filter((x) => x.recomendada);
    expect(rec).toHaveLength(1);
    expect(rec[0].punta).toBe(false);
  });

  it('mañana la franja recomendada es la de las 10:00 (historia de la demo)', () => {
    const f = franjasDelDia(estado, manana, { ahora: HOY, cierre: cierreRecepcion(nave('N1')) });
    expect(f.find((x) => x.recomendada)?.hora).toBe(10);
  });

  it('respeta el cierre de recepción de la nave', () => {
    // Atacama Bridge embarca hoy a las 23:00: la recepción cierra a las 17:00.
    const f = franjasDelDia(estado, hoy, { ahora: HOY, cierre: cierreRecepcion(nave('N4')) });
    expect(f.find((x) => x.hora === 16)?.motivo).not.toBe('cierre');
    expect(f.filter((x) => x.hora >= 17).every((x) => x.motivo === 'cierre')).toBe(true);
  });

  it('si solo queda horario punta, recomienda dentro de la punta', () => {
    const f = franjasDelDia(estado, hoy, {
      ahora: enDia(HOY, 0, 11, 30),
      cierre: cierreRecepcion(nave('N4')),
    });
    const rec = f.find((x) => x.recomendada);
    expect(rec?.punta).toBe(true);
    expect(rec?.disponible).toBe(true);
  });

  it('al reprogramar, el cupo de la propia cita no cuenta como ocupado', () => {
    const cita = estado.citas.find((c) => c.fecha === hoy && c.franja === 18)!;
    const normal = franjasDelDia(estado, hoy, { ahora: HOY }).find((x) => x.hora === 18)!;
    const sinElla = franjasDelDia(estado, hoy, { ahora: HOY, reprogramando: cita }).find((x) => x.hora === 18)!;
    expect(sinElla.ocupados).toBe(normal.ocupados - 1);
    expect(sinElla.actual).toBe(true);
  });

  it('al reprogramar, nunca recomienda la franja que ya tiene la cita', () => {
    const cita = { id: 'X', fecha: manana, franja: 10 };
    const f = franjasDelDia(estado, manana, { ahora: HOY, reprogramando: cita });
    const rec = f.find((x) => x.recomendada)!;
    expect(rec.hora).not.toBe(10);
    expect(rec.punta).toBe(false);
  });

  it('al reprogramar el mismo día (atraso) recomienda una franja posterior a la actual', () => {
    const f = franjasDelDia(estado, manana, { ahora: HOY, reprogramando: { id: 'X', fecha: manana, franja: 10 } });
    expect(f.find((x) => x.recomendada)?.hora).toBe(11);
  });

  it('sin franjas disponibles no hay recomendada', () => {
    const f = franjasDelDia(estado, hoy, { ahora: enDia(HOY, 0, 21) });
    expect(f.some((x) => x.recomendada)).toBe(false);
  });
});
