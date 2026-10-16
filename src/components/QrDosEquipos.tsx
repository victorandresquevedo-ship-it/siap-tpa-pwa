// "Modo demo dos dispositivos": QR con el estado de una cita, para cargarla en el otro equipo sin servidor.

import { useState } from 'react';
import { crearPaquete, urlImportacion } from '../data/paquete';
import type { DemoState } from '../data/types';
import { CodigoQr } from './CodigoQr';

const esLocal = (host: string) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);

export function QrDosEquipos({ demo, citaId, texto }: { demo: DemoState; citaId: string; texto: string }) {
  const [visible, setVisible] = useState(false);
  const url = urlImportacion(window.location.origin, crearPaquete(demo, citaId));

  return (
    <div className="pila">
      <button
        type="button"
        className="btn btn--secundario btn--grande btn--bloque"
        aria-expanded={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? 'Ocultar QR' : 'Modo demo dos dispositivos'}
      </button>
      {visible && (
        <>
          <p style={{ margin: 0 }}>{texto}</p>
          <CodigoQr texto={url} etiqueta={`Código QR para cargar la cita ${citaId} en el otro equipo`} tamano={300} />
          {esLocal(window.location.hostname) && (
            <p className="aviso-info">
              Abriste la app como «localhost»: otro equipo no podrá abrir este enlace. Usa la dirección de red que
              muestra <code>npm run dev</code> (Network) o la dirección publicada en Vercel.
            </p>
          )}
          <p className="texto-suave" style={{ margin: 0, fontSize: '0.9rem' }}>
            Sin servidor: si algo cambia después, vuelve a generar y escanear el código. Los datos van después del «#»
            del enlace, que no se envía a ningún servidor.
          </p>
        </>
      )}
    </div>
  );
}
