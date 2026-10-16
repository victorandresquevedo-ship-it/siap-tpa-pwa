// Utilidades de fecha en hora local (Chile). Sin librerías externas.

const dos = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-DD en hora local. */
export function fechaISO(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Fecha local a `dias` días de `base`, a la hora indicada. */
export function enDia(base: Date, dias: number, hora: number, minuto = 0): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias, hora, minuto);
}

/** Convierte AAAA-MM-DD a Date local (00:00). */
export function desdeFechaISO(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Momento que se entrega al motor: la hora actual redondeada hacia abajo a 15 minutos,
 * para que la sugerencia no cambie de un segundo a otro con las mismas condiciones.
 */
export function momentoCalculo(d: Date = new Date()): string {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - (x.getMinutes() % 15), 0, 0);
  return x.toISOString();
}

export const textoHora = (h: number) => `${dos(h)}:00`;
export const textoFranja = (h: number) => `${textoHora(h)}–${textoHora(h + 1)}`;

/** "vie 16 oct" */
export function textoFechaCorta(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(desdeFechaISO(fecha))
    .replace(/[.,]/g, '');
}

/** "Hoy", "Mañana" o "vie 16 oct". */
export function textoDia(fecha: string, hoy: Date = new Date()): string {
  if (fecha === fechaISO(hoy)) return 'Hoy';
  if (fecha === fechaISO(enDia(hoy, 1, 0))) return 'Mañana';
  return textoFechaCorta(fecha);
}

/** "Mañana, sáb 17 oct" o "dom 18 oct". */
export function textoDiaCompleto(fecha: string, hoy: Date = new Date()): string {
  const relativo = textoDia(fecha, hoy);
  const corto = textoFechaCorta(fecha);
  return relativo === corto ? corto : `${relativo}, ${corto}`;
}

/** "02:00" a partir de una fecha. */
export function textoHoraDe(d: Date): string {
  return `${dos(d.getHours())}:${dos(d.getMinutes())}`;
}

/** "16-10 08:00" a partir de un ISO 8601. */
export function textoFechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
