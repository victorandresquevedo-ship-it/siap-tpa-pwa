import { useState } from 'react';
import { store } from '../data/store';
import { IconoReiniciar } from './Iconos';

/** "Reiniciar demo": restaura los datos de ejemplo, con confirmación en un segundo toque. */
export function BotonReiniciar() {
  const [confirmando, setConfirmando] = useState(false);
  const [listo, setListo] = useState(false);

  async function reiniciar() {
    await store.reiniciarDemo();
    setConfirmando(false);
    setListo(true);
    setTimeout(() => setListo(false), 2500);
  }

  if (confirmando) {
    return (
      <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>¿Volver a los datos de ejemplo?</span>
        <button type="button" className="btn btn--peligro" onClick={reiniciar}>
          Sí, reiniciar
        </button>
        <button type="button" className="btn btn--secundario" onClick={() => setConfirmando(false)}>
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <span role="status">{listo ? 'Demo reiniciada.' : ''}</span>
      <button type="button" className="btn btn--secundario" onClick={() => setConfirmando(true)}>
        <IconoReiniciar /> Reiniciar demo
      </button>
    </span>
  );
}
