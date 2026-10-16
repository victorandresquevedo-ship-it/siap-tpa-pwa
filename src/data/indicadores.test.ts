import { describe, expect, it } from 'vitest';
import { decidirPosicion, registrarHito, reservarCita } from './acciones';
import { enDia, fechaISO } from './fechas';
import { calcularIndicadores, medicionesDemo, nivelPorAvance } from './indicadores';
import { EJEMPLOS, crearEstadoDemo } from './seed';

const AHORA = new Date(2026, 9, 16, 10, 0);
const porCodigo = (e: ReturnType<typeof crearEstadoDemo>) =>
  Object.fromEntries(calcularIndicadores(e, AHORA).map((i) => [i.codigo, i]));

describe('indicadores del turno', () => {
  const estado = crearEstadoDemo(AHORA);

  it('entrega M1 a M8, cada uno con meta, semáforo y fuente', () => {
    const ind = calcularIndicadores(estado, AHORA);
    expect(ind.map((i) => i.codigo)).toEqual(['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8']);
    for (const i of ind) {
      expect(i.meta).not.toBe('');
      expect(['verde', 'amarillo', 'rojo']).toContain(i.nivel);
      expect(['demo', 'simulado']).toContain(i.fuente);
    }
  });

  it('calcula con los datos de la demo: atención promedio, aceptadas y cumplimiento de franja', () => {
    const m = medicionesDemo(estado, AHORA);
    expect(m.atencionPromedio).toBeCloseTo((44 + 39 + 36 + 41 + 33 + 38) / 6);
    expect(m.aceptadasRatio).toBeCloseTo(13 / 17);
    expect(m.dentroDeFranjaRatio).toBeCloseTo(4 / 6);
    expect(porCodigo(estado).M1.valor).toBe('38,5 min');
  });

  it('el semáforo mide el avance desde la línea base hacia la meta', () => {
    expect(nivelPorAvance(42, 37.8, 37)).toBe('verde');
    expect(nivelPorAvance(42, 37.8, 39.5)).toBe('amarillo');
    expect(nivelPorAvance(42, 37.8, 41.5)).toBe('rojo');
    expect(nivelPorAvance(0, 70, 76)).toBe('verde');
  });

  it('modificar una sugerencia baja M4; reservar fuera de punta baja M7', () => {
    const base = porCodigo(estado);
    const cita = estado.citas.find((c) => c.estado === 'reservada' && c.fecha === fechaISO(AHORA))!;
    const modificada = decidirPosicion(estado, cita.id, { codigo: '90-10-01-1', sugerida: 'otra', puntaje: 40, motivo: 'otro' }, AHORA).estado;
    expect(parseFloat(porCodigo(modificada).M4.valor)).toBeLessThan(parseFloat(base.M4.valor));

    const { conductorId, contenedorId } = EJEMPLOS.nacional;
    const fueraDePunta = reservarCita(estado, { contenedorId, conductorId, fecha: fechaISO(AHORA), franja: 19 }, AHORA).estado;
    expect(medicionesDemo(fueraDePunta, AHORA).concentracionPuntaRatio).toBeLessThan(medicionesDemo(estado, AHORA).concentracionPuntaRatio);
  });

  it('un camión atendido dentro de su franja sube M6', () => {
    const cita = estado.citas.find((c) => c.estado === 'garita')!;
    const atendido = registrarHito(estado, cita.id, 'atendido', enDia(AHORA, 0, 12, 40), { dentroDeFranja: true }).estado;
    expect(medicionesDemo(atendido, AHORA).dentroDeFranjaRatio).toBeCloseTo(5 / 7);
  });
});
