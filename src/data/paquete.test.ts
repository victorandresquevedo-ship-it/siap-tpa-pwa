import { describe, expect, it } from 'vitest';
import { ubicarContenedor, parseBaroti } from '../engine/yard';
import { adelantarEmbarque, decidirPosicion, elegirConductor, importarCita, reservarCita } from './acciones';
import { enDia, fechaISO } from './fechas';
import { codificarPaquete, crearPaquete, decodificarPaquete, extraerPaquete, urlImportacion } from './paquete';
import { EJEMPLOS, crearEstadoDemo } from './seed';

const AHORA = new Date(2026, 9, 16, 10, 0);
const MANANA = fechaISO(enDia(AHORA, 1, 0));
const { conductorId, contenedorId } = EJEMPLOS.boliviano;

/** Notebook: reserva, posición aceptada y nave adelantada. */
function notebook() {
  let e = crearEstadoDemo(AHORA);
  e = elegirConductor(e, conductorId).estado;
  e = reservarCita(e, { contenedorId, conductorId, fecha: MANANA, franja: 10 }, AHORA).estado;
  e = decidirPosicion(e, 'C026', { codigo: '40-03-04-3', sugerida: '40-03-04-3', puntaje: 90 }, AHORA).estado;
  return adelantarEmbarque(e, 'N1', 12, AHORA).estado;
}

describe('modo demo dos dispositivos', () => {
  it('el paquete se codifica y decodifica igual, y el QR queda chico', () => {
    const p = crearPaquete(notebook(), 'C026');
    const texto = codificarPaquete(p);
    expect(decodificarPaquete(texto)).toEqual(p);
    expect(texto.length).toBeLessThan(1600);
    expect(urlImportacion('https://siap.example', p)).toMatch(/^https:\/\/siap\.example\/importar#d=[\w-]+$/);
  });

  it('rechaza un código que no es de SIAP-TPA', () => {
    expect(() => decodificarPaquete('hola')).toThrow(/no es una cita de SIAP-TPA/);
  });

  it('el celular (con sus propios datos del día) carga la cita, la nave y la posición', () => {
    const origen = notebook();
    const celular = crearEstadoDemo(AHORA); // otro equipo: mismos datos base, sin la reserva
    const { estado, resultado } = importarCita(celular, decodificarPaquete(codificarPaquete(crearPaquete(origen, 'C026'))));
    expect(estado.dispositivo).toMatchObject({ conductorId, citaId: 'C026' });
    expect(resultado.posicion?.codigo).toBe('40-03-04-3');
    expect(ubicarContenedor(estado.patio, contenedorId)).toEqual(parseBaroti('40-03-04-3'));
    expect(estado.naves.find((n) => n.id === 'N1')!.embarque).toBe(origen.naves.find((n) => n.id === 'N1')!.embarque);
    expect(resultado.tiempoEstimado.at(-1)).toEqual(origen.citas.find((c) => c.id === 'C026')!.tiempoEstimado.at(-1));
  });

  it('volver a escanear actualiza la misma cita (no la duplica)', () => {
    const p = crearPaquete(notebook(), 'C026');
    const una = importarCita(crearEstadoDemo(AHORA), p).estado;
    const dos = importarCita(una, p).estado;
    expect(dos.citas.filter((c) => c.id === 'C026')).toHaveLength(1);
  });

  it('el notebook lee el QR del celular (enlace de otra dirección) sin cambiar su conductor', () => {
    const p = crearPaquete(notebook(), 'C026');
    const leido = extraerPaquete(urlImportacion('https://otro-equipo.example', p));
    const consola = crearEstadoDemo(AHORA);
    const { estado } = importarCita(consola, leido, { comoConductor: false });
    expect(estado.dispositivo).toEqual(consola.dispositivo);
    expect(estado.citas.find((c) => c.id === 'C026')?.contenedorId).toBe(contenedorId);
  });

  it('no pisa una cita distinta que tenga el mismo número en el otro equipo', () => {
    const p = crearPaquete(notebook(), 'C026');
    let otro = crearEstadoDemo(AHORA);
    const nacional = EJEMPLOS.nacional;
    otro = reservarCita(otro, { contenedorId: nacional.contenedorId, conductorId: nacional.conductorId, fecha: MANANA, franja: 10 }, AHORA).estado;
    expect(() => importarCita(otro, p)).toThrow(/es de otro contenedor/);
  });

  it('rechaza un código de otro día', () => {
    const p = crearPaquete(notebook(), 'C026');
    expect(() => importarCita(crearEstadoDemo(enDia(AHORA, 1, 9)), p)).toThrow(/otro día/);
  });
});
