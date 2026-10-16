// Contenido de los códigos QR de la demo: la guía de despacho (la lee el conductor en el paso 1)
// y el QR de ingreso a garita. Solo texto; los QR se dibujan en el teléfono, sin internet.

import type { Cita, Conductor, Contenedor, DemoState } from './types';

const PREFIJO = 'SIAPTPA';

export function textoQrGuia(c: Pick<Contenedor, 'guia' | 'id'>): string {
  return `${PREFIJO}:GUIA:${c.guia}:${c.id}`;
}

export function textoQrIngreso(cita: Cita, contenedor: Contenedor, conductor: Conductor): string {
  return [PREFIJO, 'INGRESO', cita.id, contenedor.id, conductor.patente, cita.fecha, String(cita.franja).padStart(2, '0')].join(':');
}

export interface LecturaGuia {
  guia?: string;
  contenedor?: string;
}

/**
 * Interpreta lo leído del QR de una guía o lo escrito a mano. Acepta:
 * el formato de la demo (SIAPTPA:GUIA:...), una sigla de contenedor (ABCU1234567, con o sin
 * espacios) o un número de guía (solo dígitos).
 */
export function leerTextoGuia(texto: string): LecturaGuia | null {
  const limpio = texto.trim().toUpperCase();
  const formato = /^SIAPTPA:GUIA:(\d{4,10}):([A-Z]{4}\d{7})$/.exec(limpio);
  if (formato) return { guia: formato[1], contenedor: formato[2] };

  const compacto = limpio.replace(/[\s.-]/g, '');
  if (/^[A-Z]{4}\d{7}$/.test(compacto)) return { contenedor: compacto };
  if (/^\d{4,10}$/.test(compacto)) return { guia: compacto };
  return null;
}

/** Busca el contenedor de la demo que corresponde a la guía leída. */
export function buscarPorGuia(estado: Pick<DemoState, 'contenedores'>, lectura: LecturaGuia): Contenedor | null {
  return (
    estado.contenedores.find(
      (c) => (lectura.contenedor && c.id === lectura.contenedor) || (lectura.guia && c.guia === lectura.guia),
    ) ?? null
  );
}
