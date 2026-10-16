// Operaciones del modo conductor como funciones puras: reciben el estado y devuelven el estado
// nuevo más un resultado. El store las aplica y guarda; así se prueban sin navegador.

import { cierreRecepcion, franjasDelDia, TEXTO_NO_DISPONIBLE } from './franjas';
import { textoFranja } from './fechas';
import type { Cita, Contenedor, DemoState, Evento } from './types';

/** Error con un mensaje listo para mostrar al usuario. */
export class ErrorDemo extends Error {}

export interface Cambio<T = void> {
  estado: DemoState;
  resultado: T;
}

export interface DatosReserva {
  contenedorId: string;
  conductorId: string;
  /** AAAA-MM-DD */
  fecha: string;
  /** Hora de inicio de la franja. */
  franja: number;
}

export function citaActivaDeContenedor(estado: DemoState, contenedorId: string): Cita | undefined {
  return estado.citas.find((c) => c.contenedorId === contenedorId && c.estado !== 'atendido');
}

/** Motivo por el que no se puede reservar este contenedor, o null si se puede. */
export function motivoNoReservable(estado: DemoState, contenedorId: string): string | null {
  if (!estado.contenedores.some((c) => c.id === contenedorId)) {
    return 'No encontramos ese contenedor en los datos de la demo.';
  }
  if (estado.citas.some((c) => c.contenedorId === contenedorId && c.estado === 'atendido')) {
    return 'Este contenedor ya fue recibido en el patio.';
  }
  const activa = citaActivaDeContenedor(estado, contenedorId);
  return activa ? `Este contenedor ya tiene la cita ${activa.id}.` : null;
}

function siguienteId(prefijo: string, ids: string[], largo: number): string {
  const max = ids.reduce((m, id) => Math.max(m, Number(id.slice(prefijo.length)) || 0), 0);
  return prefijo + String(max + 1).padStart(largo, '0');
}

function conEvento(estado: DemoState, e: Omit<Evento, 'id'>): Evento[] {
  return [...estado.eventos, { id: siguienteId('E', estado.eventos.map((x) => x.id), 3), ...e }];
}

function buscarContenedor(estado: DemoState, id: string): Contenedor {
  const c = estado.contenedores.find((x) => x.id === id);
  if (!c) throw new ErrorDemo('No encontramos ese contenedor en los datos de la demo.');
  return c;
}

function validarFranja(
  estado: DemoState,
  contenedor: Contenedor,
  fecha: string,
  franja: number,
  ahora: Date,
  reprogramando?: Cita,
) {
  const nave = estado.naves.find((n) => n.id === contenedor.naveId)!;
  const info = franjasDelDia(estado, fecha, { ahora, cierre: cierreRecepcion(nave), reprogramando }).find(
    (f) => f.hora === franja,
  );
  if (!info) throw new ErrorDemo('Esa franja no existe.');
  if (info.motivo) throw new ErrorDemo(TEXTO_NO_DISPONIBLE[info.motivo]);
}

export function reservarCita(estado: DemoState, datos: DatosReserva, ahora: Date): Cambio<Cita> {
  const contenedor = buscarContenedor(estado, datos.contenedorId);
  if (!estado.conductores.some((c) => c.id === datos.conductorId)) {
    throw new ErrorDemo('No encontramos al conductor.');
  }
  const motivo = motivoNoReservable(estado, contenedor.id);
  if (motivo) throw new ErrorDemo(motivo);
  validarFranja(estado, contenedor, datos.fecha, datos.franja, ahora);

  const en = ahora.toISOString();
  const cita: Cita = {
    id: siguienteId('C', estado.citas.map((c) => c.id), 3),
    contenedorId: contenedor.id,
    conductorId: datos.conductorId,
    fecha: datos.fecha,
    franja: datos.franja,
    estado: 'reservada',
    posicion: null,
    reprogramaciones: 0,
    creadaEn: en,
    actualizadaEn: en,
  };
  return {
    estado: {
      ...estado,
      citas: [...estado.citas, cita],
      eventos: conEvento(estado, {
        tipo: 'cita_reservada',
        citaId: cita.id,
        en,
        detalle: `Cita ${cita.id} reservada para ${cita.fecha} ${textoFranja(cita.franja)}`,
      }),
      dispositivo:
        estado.dispositivo.conductorId === datos.conductorId
          ? { ...estado.dispositivo, citaId: cita.id }
          : estado.dispositivo,
    },
    resultado: cita,
  };
}

export function reprogramarCita(
  estado: DemoState,
  citaId: string,
  fecha: string,
  franja: number,
  ahora: Date,
): Cambio<Cita> {
  const cita = estado.citas.find((c) => c.id === citaId);
  if (!cita) throw new ErrorDemo('No encontramos tu cita.');
  if (cita.estado === 'atendido') throw new ErrorDemo('Esta cita ya fue atendida.');
  if (cita.fecha === fecha && cita.franja === franja) throw new ErrorDemo('Elige un horario distinto al actual.');
  validarFranja(estado, buscarContenedor(estado, cita.contenedorId), fecha, franja, ahora, cita);

  const en = ahora.toISOString();
  const nueva: Cita = {
    ...cita,
    fecha,
    franja,
    reprogramaciones: cita.reprogramaciones + 1,
    actualizadaEn: en,
  };
  return {
    estado: {
      ...estado,
      citas: estado.citas.map((c) => (c.id === citaId ? nueva : c)),
      eventos: conEvento(estado, {
        tipo: 'cita_reprogramada',
        citaId,
        en,
        detalle: `${cita.fecha} ${textoFranja(cita.franja)} → ${fecha} ${textoFranja(franja)}`,
      }),
    },
    resultado: nueva,
  };
}

export function aceptarConsentimiento(estado: DemoState, ahora: Date): Cambio {
  return {
    estado: { ...estado, dispositivo: { ...estado.dispositivo, consentimientoEn: ahora.toISOString() } },
    resultado: undefined,
  };
}

/** Elige el conductor de ejemplo que usa este teléfono y recupera su cita activa, si tiene. */
export function elegirConductor(estado: DemoState, conductorId: string): Cambio {
  if (!estado.conductores.some((c) => c.id === conductorId)) throw new ErrorDemo('No encontramos al conductor.');
  const activa = estado.citas
    .filter((c) => c.conductorId === conductorId && c.estado !== 'atendido')
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))[0];
  return {
    estado: { ...estado, dispositivo: { ...estado.dispositivo, conductorId, citaId: activa?.id ?? null } },
    resultado: undefined,
  };
}

/** "Borrar mis datos": olvida en este teléfono el consentimiento, la identidad y el enlace a la cita. */
export function borrarMisDatos(estado: DemoState): Cambio {
  return {
    estado: { ...estado, dispositivo: { consentimientoEn: null, conductorId: null, citaId: null } },
    resultado: undefined,
  };
}
