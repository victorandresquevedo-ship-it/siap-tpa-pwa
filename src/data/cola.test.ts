import { describe, expect, it } from 'vitest';
import { encolarPendiente, enviarPendientes, pendientesSinEnviar } from './acciones';
import { crearEstadoDemo } from './seed';

const AHORA = new Date(2026, 9, 16, 10, 0);

describe('cola "pendiente de enviar"', () => {
  it('guarda los cambios hechos sin señal y los marca como enviados al volver la conexión', () => {
    let e = crearEstadoDemo(AHORA);
    expect(e.pendientes).toEqual([]);
    e = encolarPendiente(e, 'C020', 'Reprogramación a 18:00–19:00', AHORA);
    e = encolarPendiente(e, 'C021', 'Encuesta', AHORA);
    expect(pendientesSinEnviar(e).map((p) => p.id)).toEqual(['P001', 'P002']);
    expect(pendientesSinEnviar(e, 'C020')).toHaveLength(1);

    const { estado, resultado } = enviarPendientes(e, new Date(2026, 9, 16, 10, 5));
    expect(resultado).toBe(2);
    expect(pendientesSinEnviar(estado)).toEqual([]);
    expect(estado.pendientes.every((p) => p.enviadoEn)).toBe(true);
  });

  it('sin pendientes no cambia nada', () => {
    const e = crearEstadoDemo(AHORA);
    expect(enviarPendientes(e, AHORA)).toEqual({ estado: e, resultado: 0 });
  });
});
