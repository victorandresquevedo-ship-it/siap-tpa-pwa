import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { describe, expect, it } from 'vitest';
import { buscarPorGuia, leerTextoGuia, textoQrGuia } from './qr';
import { EJEMPLOS, crearEstadoDemo } from './seed';

/** Dibuja un QR en píxeles (como lo vería la cámara) y lo lee con jsQR. */
function dibujarYLeer(texto: string): string | null {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: 'M' });
  const escala = 4;
  const margen = 4;
  const lado = (modules.size + margen * 2) * escala;
  const pixeles = new Uint8ClampedArray(lado * lado * 4).fill(255);
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (!modules.get(y, x)) continue;
      for (let dy = 0; dy < escala; dy++) {
        for (let dx = 0; dx < escala; dx++) {
          const i = (((y + margen) * escala + dy) * lado + (x + margen) * escala + dx) * 4;
          pixeles[i] = pixeles[i + 1] = pixeles[i + 2] = 0;
        }
      }
    }
  }
  return jsQR(pixeles, lado, lado)?.data ?? null;
}

describe('QR de la guía', () => {
  const estado = crearEstadoDemo(new Date(2026, 9, 16, 10, 0));
  const ejemplo = estado.contenedores.find((c) => c.id === EJEMPLOS.boliviano.contenedorId)!;

  it('el QR de la guía de ejemplo se lee y lleva al contenedor correcto', () => {
    const leido = dibujarYLeer(textoQrGuia(ejemplo));
    expect(leido).toBe(`SIAPTPA:GUIA:${EJEMPLOS.boliviano.guia}:${ejemplo.id}`);
    expect(buscarPorGuia(estado, leerTextoGuia(leido!)!)).toEqual(ejemplo);
  });

  it('acepta la sigla escrita a mano, con espacios o minúsculas', () => {
    const conEspacios = `${ejemplo.id.slice(0, 4).toLowerCase()} ${ejemplo.id.slice(4, 10)} ${ejemplo.id[10]}`;
    expect(leerTextoGuia(conEspacios)).toEqual({ contenedor: ejemplo.id });
  });

  it('acepta el número de guía', () => {
    expect(buscarPorGuia(estado, leerTextoGuia(` ${EJEMPLOS.boliviano.guia} `)!)?.id).toBe(ejemplo.id);
  });

  it('rechaza textos que no son guía ni contenedor', () => {
    expect(leerTextoGuia('https://example.com')).toBeNull();
    expect(leerTextoGuia('')).toBeNull();
  });

  it('una guía que no existe en la demo no encuentra contenedor', () => {
    expect(buscarPorGuia(estado, { guia: '9999999' })).toBeNull();
  });
});
