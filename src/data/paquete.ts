// "Modo demo dos dispositivos" sin servidor: la cita del conductor viaja en un QR como enlace
// `/importar#d=...`. Lo que va después del # nunca se envía a un servidor.

import { ErrorDemo } from './acciones';
import type { Cita, DemoState } from './types';

export interface PaqueteCita {
  v: 1;
  /** Día base de la demo: ambos equipos deben tener los mismos datos de ejemplo. */
  dia: string;
  cita: Cita;
  /** La nave puede haber adelantado su embarque. */
  nave: { id: string; embarque: string };
}

export function crearPaquete(estado: DemoState, citaId: string): PaqueteCita {
  const cita = estado.citas.find((c) => c.id === citaId);
  if (!cita) throw new ErrorDemo('No encontramos esa cita.');
  const contenedor = estado.contenedores.find((c) => c.id === cita.contenedorId)!;
  const nave = estado.naves.find((n) => n.id === contenedor.naveId)!;
  return {
    v: 1,
    dia: estado.diaBase,
    // Se recorta el historial para que el QR sea chico y fácil de escanear.
    cita: {
      ...cita,
      tiempoEstimado: cita.tiempoEstimado.slice(-2),
      avisos: cita.avisos.filter((a) => !a.visto).slice(-2),
    },
    nave: { id: nave.id, embarque: nave.embarque },
  };
}

function aBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function desdeBase64Url(texto: string): string {
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

export function codificarPaquete(p: PaqueteCita): string {
  return aBase64Url(JSON.stringify(p));
}

export function decodificarPaquete(texto: string): PaqueteCita {
  try {
    const p = JSON.parse(desdeBase64Url(texto)) as PaqueteCita;
    if (p?.v !== 1 || typeof p.dia !== 'string' || !p.cita?.id || !p.nave?.id) throw new Error();
    return p;
  } catch {
    throw new ErrorDemo('El código no es una cita de SIAP-TPA o está incompleto. Vuelve a escanearlo.');
  }
}

/** Enlace que abre el celular al escanear el QR. */
export function urlImportacion(origen: string, p: PaqueteCita): string {
  return `${origen}/importar#d=${codificarPaquete(p)}`;
}

/** Acepta el enlace completo leído de un QR (de cualquier dirección) o solo el código. */
export function extraerPaquete(texto: string): PaqueteCita {
  const limpio = texto.trim();
  const enlace = /[#&]d=([\w-]+)/.exec(limpio);
  return decodificarPaquete(enlace ? enlace[1] : limpio);
}
