import type { Patio } from '../engine/yard';

export type Region = 'Asia' | 'Europa' | 'EE.UU.';

export interface Puerto {
  /** UN/LOCODE, por ejemplo CNSHA. */
  codigo: string;
  nombre: string;
  pais: string;
  region: Region;
}

export interface Nave {
  id: string;
  nombre: string;
  naviera: string;
  /** Sitio de atraque. */
  sitio: number;
  /** Fecha y hora de embarque (ISO 8601). */
  embarque: string;
  destinos: string[];
}

export type Nacionalidad = 'CL' | 'BO';

export interface Conductor {
  id: string;
  nombre: string;
  patente: string;
  telefono: string;
  nacionalidad: Nacionalidad;
}

export interface Contenedor {
  /** Sigla ISO 6346, por ejemplo TPAU1234565. */
  id: string;
  naveId: string;
  /** Código del puerto de destino. */
  puerto: string;
  pesoT: number;
  tipo: '20' | '40';
  /** Número de la guía de despacho (lo que trae el QR de la guía). */
  guia: string;
}

/** Estados del camión: en ruta → en antepuerto → en garita → atendido. */
export type EstadoCita = 'reservada' | 'en_ruta' | 'antepuerto' | 'garita' | 'atendido';

export type MotivoCambio = 'bloque_lleno' | 'mantencion' | 'pedido_patio' | 'otro';

export interface PosicionAsignada {
  /** Coordenada Baroti definitiva. */
  codigo: string;
  /** Lo que propuso el motor (para medir % de sugerencias aceptadas). */
  sugerida: string;
  puntaje: number;
  decision: 'aceptada' | 'modificada';
  motivo?: MotivoCambio;
  decididaEn: string;
}

export interface Atencion {
  minutos: number;
  dentroDeFranja: boolean;
  /** Encuesta de 1 toque: 1 (muy mal) a 5 (muy bien). */
  encuesta?: 1 | 2 | 3 | 4 | 5;
}

export interface Cita {
  id: string;
  contenedorId: string;
  conductorId: string;
  /** Día de la cita, AAAA-MM-DD (hora local). */
  fecha: string;
  /** Hora de inicio de la franja (8 a 19); cada franja dura 1 hora. */
  franja: number;
  estado: EstadoCita;
  /** null mientras el planificador no decide. */
  posicion: PosicionAsignada | null;
  reprogramaciones: number;
  atencion?: Atencion;
  creadaEn: string;
  actualizadaEn: string;
}

export type TipoEvento =
  | 'cita_reservada'
  | 'cita_reprogramada'
  | 'posicion_aceptada'
  | 'posicion_modificada'
  | 'estado_cambiado'
  | 'embarque_adelantado';

export interface Evento {
  id: string;
  tipo: TipoEvento;
  citaId?: string;
  en: string;
  detalle: string;
}

/** Datos del conductor que usa este teléfono (consentimiento e identidad de la demo). */
export interface Dispositivo {
  /** Momento en que aceptó el uso de datos (ISO 8601); null si no ha aceptado. */
  consentimientoEn: string | null;
  conductorId: string | null;
  /** Cita activa del conductor en este teléfono. */
  citaId: string | null;
}

export interface DemoState {
  /** Versión del esquema; si cambia, se regeneran los datos de ejemplo. */
  version: number;
  /** Día base de la demo (AAAA-MM-DD): las fechas de ejemplo se calculan desde aquí. */
  diaBase: string;
  /** Contador que sube con cada cambio guardado (sirve para sincronizar pestañas). */
  revision: number;
  puertos: Puerto[];
  naves: Nave[];
  conductores: Conductor[];
  contenedores: Contenedor[];
  citas: Cita[];
  patio: Patio;
  eventos: Evento[];
  dispositivo: Dispositivo;
}
