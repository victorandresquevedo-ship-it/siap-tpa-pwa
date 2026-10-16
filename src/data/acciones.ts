// Operaciones del modo conductor como funciones puras: reciben el estado y devuelven el estado
// nuevo más un resultado. El store las aplica y guarda; así se prueban sin navegador.

import {
  NIVELES,
  colocar,
  formatoBaroti,
  indicePila,
  parseBaroti,
  retirar,
  tramoPeso,
  type Patio,
} from '../engine/yard';
import { CAPACIDAD_FRANJA, cierreRecepcion, franjasDelDia, TEXTO_NO_DISPONIBLE } from './franjas';
import { textoFranja } from './fechas';
import { ORDEN_ESTADOS, TEXTO_ESTADO, estimarAlReservar, tiempoVigente } from './seguimiento';
import {
  TEXTO_MOTIVO,
  type AvisoConductor,
  type Cita,
  type Contenedor,
  type DemoState,
  type EstadoCita,
  type Evento,
  type MotivoCambio,
} from './types';
import type { PaqueteCita } from './paquete';

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

/** Agrega un valor nuevo al tiempo estimado (si cambia), siempre con su motivo. */
function conTiempo(cita: Cita, minutos: number, motivo: string, en: string): Cita {
  const anterior = tiempoVigente(cita)?.minutos ?? minutos;
  const delta = minutos - anterior;
  if (cita.tiempoEstimado.length > 0 && delta === 0) return cita;
  return { ...cita, tiempoEstimado: [...cita.tiempoEstimado, { en, minutos, delta, motivo }] };
}

function conAviso(cita: Cita, titulo: string, detalle: string, en: string): Cita {
  const aviso: AvisoConductor = { id: `${cita.id}-A${cita.avisos.length + 1}`, en, titulo, detalle, visto: false };
  return { ...cita, avisos: [...cita.avisos, aviso] };
}

function reemplazar(citas: Cita[], nueva: Cita): Cita[] {
  return citas.map((c) => (c.id === nueva.id ? nueva : c));
}

function buscarCita(estado: DemoState, citaId: string): Cita {
  const cita = estado.citas.find((c) => c.id === citaId);
  if (!cita) throw new ErrorDemo('No encontramos esa cita.');
  return cita;
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
  const estimacion = estimarAlReservar(estado, datos.fecha, datos.franja);
  const cita: Cita = {
    id: siguienteId('C', estado.citas.map((c) => c.id), 3),
    contenedorId: contenedor.id,
    conductorId: datos.conductorId,
    fecha: datos.fecha,
    franja: datos.franja,
    estado: 'reservada',
    posicion: null,
    reprogramaciones: 0,
    enFilaDesde: en,
    tiempoEstimado: [{ en, minutos: estimacion.minutos, delta: 0, motivo: estimacion.motivo }],
    avisos: [],
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
  const estimacion = estimarAlReservar(estado, fecha, franja, cita.id);
  const nueva: Cita = conTiempo(
    { ...cita, fecha, franja, reprogramaciones: cita.reprogramaciones + 1, enFilaDesde: en, actualizadaEn: en },
    estimacion.minutos,
    `Reprogramaste a ${textoFranja(franja)}, franja con ${estimacion.tomados} de ${CAPACIDAD_FRANJA} cupos tomados`,
    en,
  );
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

// ---------- Planificador: posición en el patio ----------

export interface DecisionPosicion {
  /** Coordenada elegida (la sugerida o una alternativa). */
  codigo: string;
  /** Lo que sugirió el motor para esta cita. */
  sugerida: string;
  puntaje: number;
  /** Obligatorio si la elegida no es la sugerida. */
  motivo?: MotivoCambio;
}

/** Minutos extra (o menos) de atención por metro de diferencia al cambiar de bloque. */
const MINUTOS_POR_METRO = 1 / 60;

/**
 * Acepta o modifica la posición de una cita: la deja en el patio, avisa al conductor y, si cambió
 * de bloque, ajusta su tiempo estimado con el motivo.
 */
export function decidirPosicion(estado: DemoState, citaId: string, d: DecisionPosicion, ahora: Date): Cambio<Cita> {
  const cita = buscarCita(estado, citaId);
  if (cita.estado === 'atendido') throw new ErrorDemo('Esta cita ya fue atendida.');
  const coord = parseBaroti(d.codigo);
  if (!coord) throw new ErrorDemo(`La coordenada ${d.codigo} no es válida.`);
  const contenedor = buscarContenedor(estado, cita.contenedorId);

  const patioSin = retirar(estado.patio, contenedor.id);
  const bloque = patioSin.bloques.find((b) => b.id === coord.bloque)!;
  if (bloque.mantencion) throw new ErrorDemo(`El bloque ${bloque.id} está en mantención.`);
  const pila = bloque.pilas[indicePila(coord.bahia, coord.fila)];
  if (pila.carga.length >= NIVELES) throw new ErrorDemo('Esa pila está llena.');
  if (pila.carga.some((c) => c.naveId !== contenedor.naveId || c.puerto !== contenedor.puerto)) {
    throw new ErrorDemo('Esa pila tiene contenedores de otra nave o de otro destino.');
  }
  // El nivel real es la altura de la pila + 1.
  const real = { ...coord, nivel: pila.carga.length + 1 };
  const codigo = formatoBaroti(real);
  const patio = colocar(patioSin, real, {
    contenedorId: contenedor.id,
    naveId: contenedor.naveId,
    puerto: contenedor.puerto,
    tramo: tramoPeso(contenedor.pesoT),
  });

  const en = ahora.toISOString();
  const modificada = codigo !== d.sugerida;
  const motivo = modificada ? (d.motivo ?? 'otro') : undefined;
  const anterior = cita.posicion;
  let nueva: Cita = {
    ...cita,
    posicion: {
      codigo,
      sugerida: d.sugerida,
      puntaje: d.puntaje,
      decision: modificada ? 'modificada' : 'aceptada',
      motivo,
      decididaEn: en,
    },
    actualizadaEn: en,
  };

  if (!anterior) {
    nueva = conAviso(nueva, 'Ya tienes posición en el patio', `Tu contenedor va a ${codigo}.`, en);
  } else if (anterior.codigo !== codigo) {
    const razon = TEXTO_MOTIVO[motivo ?? d.motivo ?? 'otro'];
    nueva = conAviso(nueva, 'Cambió tu posición', `${anterior.codigo} → ${codigo}. Motivo: ${razon}.`, en);
    const bloqueAnterior = parseBaroti(anterior.codigo)?.bloque;
    if (bloqueAnterior !== real.bloque) {
      const distancia = (id: number | undefined) => estado.patio.bloques.find((b) => b.id === id)?.distanciaM ?? 0;
      const delta = Math.round((distancia(real.bloque) - distancia(bloqueAnterior)) * MINUTOS_POR_METRO);
      const vigente = tiempoVigente(nueva)?.minutos ?? 0;
      if (delta !== 0) {
        nueva = conTiempo(
          nueva,
          vigente + delta,
          `Tu posición cambió al bloque ${real.bloque}, ${delta > 0 ? 'más lejos' : 'más cerca'} del frente de atraque`,
          en,
        );
      }
    }
  }

  return {
    estado: {
      ...estado,
      patio,
      citas: reemplazar(estado.citas, nueva),
      eventos: conEvento(estado, {
        tipo: modificada ? 'posicion_modificada' : 'posicion_aceptada',
        citaId,
        en,
        detalle: modificada ? `${d.sugerida} → ${codigo} (${TEXTO_MOTIVO[motivo!]})` : codigo,
      }),
    },
    resultado: nueva,
  };
}

// ---------- Terminal: hitos del camión y eventos de nave ----------

export interface OpcionesAtencion {
  /** Minutos reales de atención; por defecto, el tiempo estimado vigente. */
  minutos?: number;
  /** Si llegó dentro de su franja (por defecto sí). */
  dentroDeFranja?: boolean;
}

/** Registra un hito del camión (en ruta, antepuerto, garita, atendido). Solo avanza, nunca retrocede. */
export function registrarHito(
  estado: DemoState,
  citaId: string,
  nuevo: EstadoCita,
  ahora: Date,
  opciones: OpcionesAtencion = {},
): Cambio<Cita> {
  const cita = buscarCita(estado, citaId);
  if (ORDEN_ESTADOS.indexOf(nuevo) <= ORDEN_ESTADOS.indexOf(cita.estado)) {
    throw new ErrorDemo(`La cita ya está "${TEXTO_ESTADO[cita.estado]}".`);
  }
  if ((nuevo === 'garita' || nuevo === 'atendido') && !cita.posicion) {
    throw new ErrorDemo('Antes de entrar por garita, el planificador debe asignar la posición.');
  }
  const en = ahora.toISOString();
  const nueva: Cita = {
    ...cita,
    estado: nuevo,
    actualizadaEn: en,
    atencion:
      nuevo === 'atendido'
        ? {
            minutos: opciones.minutos ?? tiempoVigente(cita)?.minutos ?? 0,
            dentroDeFranja: opciones.dentroDeFranja ?? true,
          }
        : cita.atencion,
  };
  return {
    estado: {
      ...estado,
      citas: reemplazar(estado.citas, nueva),
      eventos: conEvento(estado, {
        tipo: 'estado_cambiado',
        citaId,
        en,
        detalle: `${TEXTO_ESTADO[cita.estado]} → ${TEXTO_ESTADO[nuevo]}`,
      }),
    },
    resultado: nueva,
  };
}

/** Minutos que suma a sus camiones una nave que adelanta su embarque (el patio prioriza su carga). */
export const MINUTOS_EMBARQUE_ADELANTADO = 6;

/** Una nave adelanta su embarque: sus camiones pendientes suman tiempo, siempre con el motivo. */
export function adelantarEmbarque(estado: DemoState, naveId: string, horas: number, ahora: Date): Cambio<number> {
  const nave = estado.naves.find((n) => n.id === naveId);
  if (!nave) throw new ErrorDemo('No encontramos esa nave.');
  const en = ahora.toISOString();
  const embarque = new Date(Date.parse(nave.embarque) - horas * 3_600_000).toISOString();
  const deLaNave = new Set(estado.contenedores.filter((c) => c.naveId === naveId).map((c) => c.id));
  let afectadas = 0;
  const citas = estado.citas.map((c) => {
    if (!deLaNave.has(c.contenedorId) || c.estado === 'atendido') return c;
    afectadas++;
    return conTiempo(
      c,
      (tiempoVigente(c)?.minutos ?? 0) + MINUTOS_EMBARQUE_ADELANTADO,
      `${nave.nombre} adelantó su embarque y el patio prioriza su carga`,
      en,
    );
  });
  return {
    estado: {
      ...estado,
      naves: estado.naves.map((n) => (n.id === naveId ? { ...n, embarque } : n)),
      citas,
      eventos: conEvento(estado, {
        tipo: 'embarque_adelantado',
        en,
        detalle: `${nave.nombre} adelantó su embarque ${horas} h (${afectadas} citas con +${MINUTOS_EMBARQUE_ADELANTADO} min)`,
      }),
    },
    resultado: afectadas,
  };
}

// ---------- Conductor: encuesta y avisos ----------

export function responderEncuesta(estado: DemoState, citaId: string, nota: 1 | 2 | 3 | 4 | 5, ahora: Date): Cambio {
  const cita = buscarCita(estado, citaId);
  if (!cita.atencion) throw new ErrorDemo('La encuesta se responde después de la atención.');
  const nueva = { ...cita, atencion: { ...cita.atencion, encuesta: nota } };
  return {
    estado: {
      ...estado,
      citas: reemplazar(estado.citas, nueva),
      eventos: conEvento(estado, { tipo: 'encuesta_respondida', citaId, en: ahora.toISOString(), detalle: `Nota ${nota}` }),
    },
    resultado: undefined,
  };
}

export function marcarAvisosVistos(estado: DemoState, citaId: string): Cambio {
  const cita = buscarCita(estado, citaId);
  const nueva = { ...cita, avisos: cita.avisos.map((a) => ({ ...a, visto: true })) };
  return { estado: { ...estado, citas: reemplazar(estado.citas, nueva) }, resultado: undefined };
}

// ---------- Modo demo dos dispositivos ----------

/**
 * Carga la cita que trae el QR de "Modo demo dos dispositivos". Sirve en ambos sentidos:
 * en el celular (comoConductor: la cita queda como la de este teléfono) y en el notebook de la
 * consola (solo se actualiza la cita). Los datos base (naves, contenedores, patio) son los mismos
 * en ambos equipos porque se generan igual cada día.
 */
export function importarCita(
  estado: DemoState,
  paquete: PaqueteCita,
  { comoConductor = true }: { comoConductor?: boolean } = {},
): Cambio<Cita> {
  if (paquete.dia !== estado.diaBase) {
    throw new ErrorDemo('Este código es de otro día. Reinicia la demo en ambos equipos y vuelve a generarlo.');
  }
  const { cita, nave } = paquete;
  const contenedor = buscarContenedor(estado, cita.contenedorId);
  if (!estado.conductores.some((c) => c.id === cita.conductorId)) throw new ErrorDemo('No encontramos al conductor.');
  if (estado.citas.some((c) => c.id === cita.id && c.contenedorId !== cita.contenedorId)) {
    throw new ErrorDemo(
      `En este equipo la cita ${cita.id} es de otro contenedor. Reinicia la demo en ambos equipos y vuelve a empezar.`,
    );
  }

  let patio: Patio = retirar(estado.patio, contenedor.id);
  const coord = cita.posicion && parseBaroti(cita.posicion.codigo);
  if (coord) {
    try {
      patio = colocar(patio, coord, {
        contenedorId: contenedor.id,
        naveId: contenedor.naveId,
        puerto: contenedor.puerto,
        tramo: tramoPeso(contenedor.pesoT),
      });
    } catch {
      // La pila de este equipo está llena: el patio local no se ajusta, la cita igual se muestra.
    }
  }
  // Misma cita: se reemplaza. Cita nueva: reemplaza a otra cita activa del mismo contenedor, si había.
  const existe = estado.citas.some((c) => c.id === cita.id);
  const citas = existe
    ? reemplazar(estado.citas, cita)
    : [...estado.citas.filter((c) => !(c.contenedorId === cita.contenedorId && c.estado !== 'atendido')), cita];
  return {
    estado: {
      ...estado,
      patio,
      naves: estado.naves.map((n) => (n.id === nave.id ? { ...n, embarque: nave.embarque } : n)),
      citas,
      dispositivo: comoConductor
        ? { ...estado.dispositivo, conductorId: cita.conductorId, citaId: cita.id }
        : estado.dispositivo,
    },
    resultado: cita,
  };
}

// ---------- Cola "pendiente de enviar" (cambios hechos sin señal) ----------

/** Agrega a la cola local un cambio hecho sin señal. */
export function encolarPendiente(estado: DemoState, citaId: string, descripcion: string, ahora: Date): DemoState {
  const id = siguienteId('P', estado.pendientes.map((p) => p.id), 3);
  return {
    ...estado,
    pendientes: [...estado.pendientes, { id, en: ahora.toISOString(), citaId, descripcion, enviadoEn: null }],
  };
}

export function pendientesSinEnviar(estado: Pick<DemoState, 'pendientes'>, citaId?: string) {
  return estado.pendientes.filter((p) => !p.enviadoEn && (!citaId || p.citaId === citaId));
}

/** Volvió la señal: se envían (simulado) los cambios de la cola. Devuelve cuántos se enviaron. */
export function enviarPendientes(estado: DemoState, ahora: Date): Cambio<number> {
  const enviados = pendientesSinEnviar(estado).length;
  if (enviados === 0) return { estado, resultado: 0 };
  const en = ahora.toISOString();
  return {
    estado: { ...estado, pendientes: estado.pendientes.map((p) => (p.enviadoEn ? p : { ...p, enviadoEn: en })) },
    resultado: enviados,
  };
}
