// Confirmación y resumen de la cita: franja en grande, QR de ingreso para garita,
// SMS simulado y "Reprogramar" en un toque. Todo se ve sin señal (datos guardados en el teléfono).

import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CodigoQr } from '../../components/CodigoQr';
import { Semaforo } from '../../components/Semaforo';
import { textoDiaCompleto, textoFranja } from '../../data/fechas';
import { textoQrIngreso } from '../../data/qr';
import { nombrePuerto } from '../../data/seed';
import type { DemoState, EstadoCita } from '../../data/types';
import { useEnLinea } from '../../pwa/conexion';
import { PieConductor, citaActual, datosCita } from './comun';
import s from './Conductor.module.css';

export const TEXTO_ESTADO: Record<EstadoCita, string> = {
  reservada: 'Reservada',
  en_ruta: 'En ruta',
  antepuerto: 'En antepuerto',
  garita: 'En garita',
  atendido: 'Atendido',
};

export function MiCita({ demo }: { demo: DemoState }) {
  const { state } = useLocation();
  const aviso = (state as { aviso?: 'reservada' | 'reprogramada' } | null)?.aviso;
  const enLinea = useEnLinea();
  const [verQr, setVerQr] = useState(false);

  const actual = citaActual(demo);
  if (!actual) return <Navigate to="/conductor/reservar" replace />;
  const { cita, contenedor, nave, conductor } = datosCita(demo, actual);
  const cuando = `${textoDiaCompleto(cita.fecha)}, ${textoFranja(cita.franja)}`;
  const sms =
    `SIAP-TPA: Cita ${cita.id} ${cita.reprogramaciones > 0 ? 'reprogramada' : 'confirmada'}. ` +
    `${cuando}. Contenedor ${contenedor.id}, patente ${conductor.patente}. ` +
    'Muestra tu QR en garita. Para cambiar la hora abre la app y toca Reprogramar.';

  return (
    <div className={s.pantalla}>
      {aviso && (
        <p role="status" className="aviso-ok">
          {aviso === 'reservada' ? '¡Listo! Tu cita quedó reservada.' : 'Tu cita quedó reprogramada.'}
        </p>
      )}
      {!enLinea && (
        <p role="status" className="aviso-info">
          Sin señal: tu cita está guardada en este teléfono y se ve igual sin internet.
        </p>
      )}

      <section className="tarjeta pila" aria-labelledby="titulo-cita">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <h1 id="titulo-cita" style={{ margin: 0 }}>
            Tu cita
          </h1>
          <Semaforo nivel="neutro">{TEXTO_ESTADO[cita.estado]}</Semaforo>
        </div>
        <div>
          <p className={s.diaGrande}>{textoDiaCompleto(cita.fecha)}</p>
          <p className={s.horaGrande}>{textoFranja(cita.franja)}</p>
        </div>
        <dl className={s.resumen}>
          <dt>N° de cita</dt>
          <dd>{cita.id}</dd>
          <dt>Contenedor</dt>
          <dd className="mono">{contenedor.id}</dd>
          <dt>Nave</dt>
          <dd>
            {nave.nombre} → {nombrePuerto(contenedor.puerto)}
          </dd>
          <dt>Patente</dt>
          <dd>{conductor.patente}</dd>
          <dt>Posición</dt>
          <dd>
            {cita.posicion ? (
              <span className="mono">{cita.posicion.codigo}</span>
            ) : (
              'Por confirmar: el planificador la está revisando'
            )}
          </dd>
        </dl>

        <button
          type="button"
          className="btn btn--primario btn--grande btn--bloque"
          aria-expanded={verQr}
          aria-controls="qr-ingreso"
          onClick={() => setVerQr((v) => !v)}
        >
          {verQr ? 'Ocultar QR de ingreso' : 'Mostrar QR de ingreso'}
        </button>
        {verQr && (
          <div id="qr-ingreso" className={s.qrGrande}>
            <CodigoQr
              texto={textoQrIngreso(cita, contenedor, conductor)}
              etiqueta={`Código QR de ingreso a garita para la cita ${cita.id}`}
              tamano={280}
            />
            <p className={s.leyenda}>Muestra este código en garita. Funciona sin internet.</p>
          </div>
        )}

        <Link to="/conductor/reprogramar" className="btn btn--secundario btn--grande btn--bloque">
          Reprogramar
        </Link>
        <p className={s.leyenda}>¿Te atrasaste en la frontera o en la ruta? Cambia tu hora en un toque.</p>
      </section>

      <section className="tarjeta pila" aria-labelledby="titulo-sms">
        <h2 id="titulo-sms" style={{ margin: 0 }}>
          Confirmación por SMS <span className="texto-suave">(simulado)</span>
        </h2>
        <div className={s.sms}>
          <div className={s.smsCabecera}>
            <span>SMS · SIAP-TPA</span>
            <span>a {conductor.telefono}</span>
          </div>
          {sms}
        </div>
        <p className={s.leyenda}>Llega aunque no tengas plan de datos chileno.</p>
      </section>

      <PieConductor demo={demo} />
    </div>
  );
}
