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

export const TEXTO_MOTIVO: Record<MotivoCambio, string> = {
  bloque_lleno: 'Bloque lleno',
  mantencion: 'Mantención',
  pedido_patio: 'Pedido del patio',
  otro: 'Otro motivo',
};

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

/**
 * Un valor del tiempo estimado de atención. El tiempo solo cambia con un motivo:
 * cada cambio queda registrado y el conductor ve siempre el último motivo.
 */
export interface CambioTiempo {
  en: string;
  /** Tiempo estimado de atención vigente desde este cambio (minutos). */
  minutos: number;
  /** Diferencia con el valor anterior (0 en la primera estimación). */
  delta: number;
  motivo: string;
}

/** Aviso destacado para el conductor (por ejemplo, un cambio de posición). */
export interface AvisoConductor {
  id: string;
  en: string;
  titulo: string;
  detalle: string;
  visto: boolean;
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
  /** Momento en que la cita entró a su franja actual (ordena la fila). */
  enFilaDesde: string;
  /** Historial del tiempo estimado; el último es el vigente. */
  tiempoEstimado: CambioTiempo[];
  avisos: AvisoConductor[];
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
  | 'embarque_adelantado'
  | 'encuesta_respondida';

export interface Evento {
  id: string;
  tipo: TipoEvento;
  citaId?: string;
  en: string;
  detalle: string;
}

/** Cambio hecho sin señal: queda en una cola local hasta que vuelve la conexión. */
export interface Pendiente {
  id: string;
  en: string;
  citaId: string;
  descripcion: string;
  /** null mientras no se envía. */
  enviadoEn: string | null;
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
  /** Último guardado (ISO 8601): se muestra cuando no hay señal ("datos de las 10:42"). */
  actualizadoEn: string;
  puertos: Puerto[];
  naves: Nave[];
  conductores: Conductor[];
  contenedores: Contenedor[];
  citas: Cita[];
  patio: Patio;
  eventos: Evento[];
  dispositivo: Dispositivo;
  /** Cola local de cambios hechos sin señal ("pendiente de enviar"). */
  pendientes: Pendiente[];
}
