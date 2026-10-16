import { useEffect, useRef, useState } from 'react';
import { textoHoraDe } from '../data/fechas';
import { useDemo } from '../data/store';
import { useEnLinea } from '../pwa/conexion';
import { IconoSenal } from './Iconos';

const estilo = (fondo: string, color: string) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '8px 16px',
  background: fondo,
  color,
  fontWeight: 700,
  textAlign: 'center' as const,
});

/** Banner de estado de conexión: visible siempre que no hay señal, y un momento al recuperarla. */
export function BannerConexion() {
  const enLinea = useEnLinea();
  const demo = useDemo();
  const [recuperada, setRecuperada] = useState(false);
  const anterior = useRef(enLinea);

  useEffect(() => {
    if (enLinea && !anterior.current) {
      setRecuperada(true);
      const t = window.setTimeout(() => setRecuperada(false), 4000);
      anterior.current = enLinea;
      return () => window.clearTimeout(t);
    }
    anterior.current = enLinea;
  }, [enLinea]);

  return (
    <div role="status" aria-live="polite">
      {!enLinea && (
        <div style={estilo('#fff4d6', '#5c3d00')}>
          <IconoSenal size={20} />
          <span>
            Sin señal: usando datos guardados
            {demo ? ` (al ${textoHoraDe(new Date(demo.actualizadoEn))})` : ''}
          </span>
        </div>
      )}
      {enLinea && recuperada && <div style={estilo('#e5f4ea', '#14532d')}>Conexión recuperada</div>}
    </div>
  );
}
