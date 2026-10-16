// Lector de QR: cámara en vivo (requiere https) o foto tomada con la cámara del teléfono.
// Usa BarcodeDetector cuando el navegador lo trae (Chrome en Android) y si no, jsQR
// (se carga solo cuando hace falta).

import { useEffect, useRef, useState } from 'react';

interface BarcodeDetectorLike {
  detect(fuente: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorClase {
  new (opciones: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
}

type Detector = (fuente: CanvasImageSource, ancho: number, alto: number) => Promise<string | null>;

async function crearDetector(): Promise<Detector> {
  const Clase = (window as unknown as { BarcodeDetector?: BarcodeDetectorClase }).BarcodeDetector;
  if (Clase) {
    try {
      const formatos = (await Clase.getSupportedFormats?.()) ?? ['qr_code'];
      if (formatos.includes('qr_code')) {
        const detector = new Clase({ formats: ['qr_code'] });
        return async (fuente) => (await detector.detect(fuente))[0]?.rawValue ?? null;
      }
    } catch {
      // Sigue con jsQR.
    }
  }
  const { default: jsQR } = await import('jsqr');
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })!;
  return async (fuente, ancho, alto) => {
    const escala = Math.min(1, 900 / Math.max(ancho, alto));
    lienzo.width = Math.max(1, Math.round(ancho * escala));
    lienzo.height = Math.max(1, Math.round(alto * escala));
    ctx.drawImage(fuente, 0, 0, lienzo.width, lienzo.height);
    const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
  };
}

function mensajeCamara(error: unknown): string {
  switch ((error as DOMException)?.name) {
    case 'NotAllowedError':
      return 'No diste permiso para usar la cámara.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No encontramos una cámara en este equipo.';
    case 'NotReadableError':
      return 'La cámara está ocupada por otra aplicación.';
    default:
      return 'No pudimos abrir la cámara.';
  }
}

const camaraEnVivoPosible = () => window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

function VistaCamara({ onLeido, onError }: { onLeido: (t: string) => void; onError: (m: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const avisos = useRef({ onLeido, onError });
  avisos.current = { onLeido, onError };

  useEffect(() => {
    let cancelado = false;
    let stream: MediaStream | null = null;
    let espera = 0;
    const detener = () => {
      window.clearTimeout(espera);
      stream?.getTracks().forEach((t) => t.stop());
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelado || !video.current) return detener();
        video.current.srcObject = stream;
        await video.current.play();
        const detectar = await crearDetector();
        const ciclo = async () => {
          const v = video.current;
          if (cancelado || !v) return;
          if (v.readyState >= 2 && v.videoWidth > 0) {
            const texto = await detectar(v, v.videoWidth, v.videoHeight).catch(() => null);
            if (texto && !cancelado) {
              detener();
              avisos.current.onLeido(texto);
              return;
            }
          }
          espera = window.setTimeout(ciclo, 200);
        };
        void ciclo();
      } catch (error) {
        if (!cancelado) avisos.current.onError(mensajeCamara(error));
      }
    })();

    return () => {
      cancelado = true;
      detener();
    };
  }, []);

  return (
    <video
      ref={video}
      muted
      playsInline
      aria-label="Vista de la cámara: apunta al código QR de la guía"
      style={{ width: '100%', borderRadius: 12, background: '#000', aspectRatio: '4 / 3', objectFit: 'cover' }}
    />
  );
}

/** Botones para leer un QR con la cámara en vivo o con una foto. Llama a onLeido con el texto del QR. */
export function LectorQr({ onLeido }: { onLeido: (texto: string) => void }) {
  const [escaneando, setEscaneando] = useState(false);
  const [leyendoFoto, setLeyendoFoto] = useState(false);
  const [error, setError] = useState('');
  const archivo = useRef<HTMLInputElement>(null);

  function abrirCamara() {
    setError('');
    if (!camaraEnVivoPosible()) {
      setError('La cámara en vivo necesita una conexión segura (https). Usa "Tomar foto de la guía".');
      return;
    }
    setEscaneando(true);
  }

  async function leerFoto(foto: File | undefined) {
    if (!foto) return;
    setError('');
    setLeyendoFoto(true);
    try {
      const imagen = await createImageBitmap(foto);
      const texto = await (await crearDetector())(imagen, imagen.width, imagen.height);
      imagen.close();
      if (texto) onLeido(texto);
      else setError('No encontramos un código QR en la foto. Acércate a la guía y que el código salga completo.');
    } catch {
      setError('No pudimos leer la foto. Prueba de nuevo.');
    } finally {
      setLeyendoFoto(false);
      if (archivo.current) archivo.current.value = '';
    }
  }

  return (
    <div className="pila">
      {escaneando ? (
        <>
          <VistaCamara
            onLeido={(t) => {
              setEscaneando(false);
              onLeido(t);
            }}
            onError={(m) => {
              setEscaneando(false);
              setError(`${m} Puedes tomar una foto de la guía o escribir el número.`);
            }}
          />
          <button type="button" className="btn btn--secundario btn--grande btn--bloque" onClick={() => setEscaneando(false)}>
            Cerrar cámara
          </button>
        </>
      ) : (
        <button type="button" className="btn btn--primario btn--grande btn--bloque" onClick={abrirCamara}>
          Escanear QR de la guía
        </button>
      )}

      <button
        type="button"
        className="btn btn--secundario btn--grande btn--bloque"
        onClick={() => archivo.current?.click()}
        disabled={leyendoFoto}
      >
        {leyendoFoto ? 'Leyendo la foto…' : 'Tomar foto de la guía'}
      </button>
      <input
        ref={archivo}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void leerFoto(e.target.files?.[0])}
      />

      {error && (
        <p role="alert" className="aviso-error">
          {error}
        </p>
      )}
    </div>
  );
}
