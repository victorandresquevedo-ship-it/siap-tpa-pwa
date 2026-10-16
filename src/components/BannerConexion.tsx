// Banner del estado de conexión, visible en toda la app:
// - sin señal: "usando datos guardados" y cuántos cambios esperan ser enviados;
// - al volver la señal: "enviando…" y luego "cambios enviados";
// - la primera vez que el service worker guarda la app: "lista para usar sin señal".

import { useEffect, useRef, useState } from 'react';
import { pendientesSinEnviar } from '../data/acciones';
import { textoHoraDe } from '../data/fechas';
import { useDemo } from '../data/store';
import { useEnLinea } from '../pwa/conexion';
import { useListaSinSenal } from '../pwa/registrarSW';
import { IconoSenal } from './Iconos';

const estilo = (fondo: string, color: string) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap' as const,
  gap: 8,
  padding: '8px 16px',
  background: fondo,
  color,
  fontWeight: 700,
  textAlign: 'center' as const,
});

const AMARILLO = estilo('#fff4d6', '#5c3d00');
const VERDE = estilo('#e5f4ea', '#14532d');
const AZUL = estilo('#eaf3f8', '#064a6b');

const cambios = (n: number) => (n === 1 ? '1 cambio' : `${n} cambios`);

/** Muestra algo por unos segundos cuando `activar` pasa a true. */
function useMomentaneo(activar: boolean, ms = 4000): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!activar) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), ms);
    return () => window.clearTimeout(t);
  }, [activar, ms]);
  return visible;
}

export function BannerConexion() {
  const enLinea = useEnLinea();
  const demo = useDemo();
  const listaSinSenal = useListaSinSenal();
  const pendientes = demo ? pendientesSinEnviar(demo).length : 0;

  // Momentos a anunciar: se recuperó la conexión; se enviaron cambios.
  const [recuperada, setRecuperada] = useState(0);
  const [enviados, setEnviados] = useState(0);
  const conexionAnterior = useRef(enLinea);
  const pendientesAnteriores = useRef(pendientes);
  useEffect(() => {
    if (enLinea && !conexionAnterior.current) setRecuperada((n) => n + 1);
    conexionAnterior.current = enLinea;
  }, [enLinea]);
  useEffect(() => {
    if (pendientes === 0 && pendientesAnteriores.current > 0) setEnviados(pendientesAnteriores.current);
    pendientesAnteriores.current = pendientes;
  }, [pendientes]);

  const verRecuperada = useMomentaneo(recuperada > 0 && enLinea, 4000);
  const verEnviados = useMomentaneo(enviados > 0, 4000);
  const verLista = useMomentaneo(listaSinSenal, 5000);

  let contenido = null;
  if (!enLinea) {
    contenido = (
      <div style={AMARILLO}>
        <IconoSenal size={20} />
        <span>
          Sin señal: usando datos guardados{demo ? ` (al ${textoHoraDe(new Date(demo.actualizadoEn))})` : ''}
          {pendientes > 0 && ` · ${cambios(pendientes)} pendiente${pendientes === 1 ? '' : 's'} de enviar`}
        </span>
      </div>
    );
  } else if (pendientes > 0) {
    contenido = <div style={AZUL}>Conexión recuperada · enviando {cambios(pendientes)}…</div>;
  } else if (verEnviados) {
    contenido = <div style={VERDE}>✓ {cambios(enviados)} enviado{enviados === 1 ? '' : 's'}</div>;
  } else if (verRecuperada) {
    contenido = <div style={VERDE}>Conexión recuperada</div>;
  } else if (verLista) {
    contenido = <div style={VERDE}>✓ Listo: la app quedó guardada en este equipo y funciona sin señal.</div>;
  }

  return (
    <div role="status" aria-live="polite">
      {contenido}
    </div>
  );
}
