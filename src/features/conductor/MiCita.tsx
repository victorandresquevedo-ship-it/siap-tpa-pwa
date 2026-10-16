// Seguimiento del conductor (Modo C): tiempo estimado con su motivo, lugar en la fila, posición,
// estado y franja; avisos destacados, QR de ingreso, reprogramar y encuesta al ser atendido.
// Todo se ve sin señal (datos guardados en el teléfono). "Modo cabina" deja solo lo esencial.

import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { CodigoQr } from '../../components/CodigoQr';
import { QrDosEquipos } from '../../components/QrDosEquipos';
import { Semaforo } from '../../components/Semaforo';
import { textoDia, textoDiaCompleto, textoFranja, textoHoraDe } from '../../data/fechas';
import { textoQrIngreso } from '../../data/qr';
import { nombrePuerto } from '../../data/seed';
import {
  ORDEN_ESTADOS,
  TEXTO_ESTADO,
  lugarEnFila,
  textoMotivoTiempo,
  tiempoVigente,
} from '../../data/seguimiento';
import { pendientesSinEnviar } from '../../data/acciones';
import { store } from '../../data/store';
import type { Cita, DemoState } from '../../data/types';
import { PieConductor, citaActual, datosCita } from './comun';
import s from './Conductor.module.css';

const CLAVE_CABINA = 'siap-tpa:modo-cabina';

function leerCabina(): boolean {
  try {
    return localStorage.getItem(CLAVE_CABINA) === '1';
  } catch {
    return false;
  }
}

function useModoCabina(): [boolean, () => void] {
  const [activo, setActivo] = useState(leerCabina);
  const alternar = () =>
    setActivo((v) => {
      try {
        localStorage.setItem(CLAVE_CABINA, v ? '0' : '1');
      } catch {
        // Sin almacenamiento: el modo dura mientras la pantalla esté abierta.
      }
      return !v;
    });
  return [activo, alternar];
}

const CARAS: { nota: 1 | 2 | 3 | 4 | 5; cara: string; texto: string }[] = [
  { nota: 1, cara: '😠', texto: 'Muy mal' },
  { nota: 2, cara: '🙁', texto: 'Mal' },
  { nota: 3, cara: '😐', texto: 'Regular' },
  { nota: 4, cara: '🙂', texto: 'Bien' },
  { nota: 5, cara: '😄', texto: 'Muy bien' },
];

const AVISOS_NAVEGACION = {
  reservada: '¡Listo! Tu cita quedó reservada.',
  reprogramada: 'Tu cita quedó reprogramada.',
  importada: 'Cita cargada desde el otro equipo.',
};

function AvisosDestacados({ cita }: { cita: Cita }) {
  const pendientes = cita.avisos.filter((a) => !a.visto);
  if (pendientes.length === 0) return null;
  return (
    <section className={s.avisoDestacado} role="alert" aria-label="Avisos">
      {pendientes.map((a) => (
        <div key={a.id}>
          <strong>{a.titulo}</strong>
          <p>{a.detalle}</p>
        </div>
      ))}
      <button type="button" className="btn btn--primario btn--grande" onClick={() => store.marcarAvisosVistos(cita.id)}>
        Entendido
      </button>
    </section>
  );
}

function LineaEstado({ cita }: { cita: Cita }) {
  const actual = ORDEN_ESTADOS.indexOf(cita.estado);
  return (
    <ol className={s.estados} aria-label={`Estado de tu cita: ${TEXTO_ESTADO[cita.estado]}`}>
      {ORDEN_ESTADOS.map((e, i) => (
        <li
          key={e}
          className={`${s.estadoPaso} ${i < actual ? s.estadoHecho : ''} ${i === actual ? s.estadoActual : ''}`}
          aria-current={i === actual ? 'step' : undefined}
        >
          {i < actual ? '✓ ' : ''}
          {TEXTO_ESTADO[e]}
        </li>
      ))}
    </ol>
  );
}

function Atendido({ cita }: { cita: Cita }) {
  const atencion = cita.atencion!;
  return (
    <section className={`tarjeta pila ${s.atendido}`} aria-labelledby="titulo-atendido">
      <h1 id="titulo-atendido" style={{ margin: 0 }}>
        ¡Atendido!
      </h1>
      <p className={s.diaGrande}>
        Atendido en {atencion.minutos} min,{' '}
        {atencion.dentroDeFranja ? 'dentro de tu franja' : 'fuera de tu franja'}.
      </p>
      <div>
        <Semaforo nivel={atencion.dentroDeFranja ? 'verde' : 'amarillo'}>
          {atencion.dentroDeFranja ? 'Dentro de tu franja' : 'Fuera de tu franja'}
        </Semaforo>
      </div>
      {atencion.encuesta ? (
        <p role="status" className="aviso-ok">
          ¡Gracias! Tu respuesta ayuda a mejorar la atención.
        </p>
      ) : (
        <div className="pila" style={{ gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>¿Cómo te atendimos?</h2>
          <div className={s.caras} role="group" aria-label="Encuesta de satisfacción">
            {CARAS.map((c) => (
              <button
                key={c.nota}
                type="button"
                className={s.cara}
                aria-label={c.texto}
                onClick={() => store.responderEncuesta(cita.id, c.nota)}
              >
                <span aria-hidden="true">{c.cara}</span>
                <span aria-hidden="true">{c.texto}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Link to="/conductor/reservar" className="btn btn--secundario btn--grande btn--bloque">
        Nueva reserva
      </Link>
    </section>
  );
}

export function MiCita({ demo }: { demo: DemoState }) {
  const { state } = useLocation();
  const aviso = (state as { aviso?: keyof typeof AVISOS_NAVEGACION } | null)?.aviso;
  const [cabina, alternarCabina] = useModoCabina();
  const [verQr, setVerQr] = useState(false);
  // El mensaje de "reservada / reprogramada" se oculta solo, para no quedar desactualizado.
  const [verMensaje, setVerMensaje] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setVerMensaje(false), 6000);
    return () => window.clearTimeout(t);
  }, []);

  const actual = citaActual(demo);
  if (!actual) return <Navigate to="/conductor/reservar" replace />;
  const { cita, contenedor, nave, conductor } = datosCita(demo, actual);
  const tiempo = tiempoVigente(cita);
  const fila = lugarEnFila(demo, cita);
  const terminada = cita.estado === 'atendido';
  const pendientes = pendientesSinEnviar(demo, cita.id).length;
  const puedeReprogramar = cita.estado === 'reservada' || cita.estado === 'en_ruta';
  const sms =
    `SIAP-TPA: Cita ${cita.id} ${cita.reprogramaciones > 0 ? 'reprogramada' : 'confirmada'}. ` +
    `${textoDiaCompleto(cita.fecha)}, ${textoFranja(cita.franja)}. Contenedor ${contenedor.id}, patente ${conductor.patente}. ` +
    'Muestra tu QR en garita. Para cambiar la hora abre la app y toca Reprogramar.';

  return (
    <div className={`${s.pantalla} ${cabina ? s.cabina : ''}`}>
      {aviso && verMensaje && !cabina && (
        <p role="status" className="aviso-ok">
          {AVISOS_NAVEGACION[aviso]}
          {pendientes > 0 && ' Quedó guardada en este teléfono y se enviará cuando vuelva la señal.'}
        </p>
      )}

      <div className={s.barraSeguimiento}>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Semaforo nivel="neutro">
            Cita {cita.id} · {TEXTO_ESTADO[cita.estado]}
          </Semaforo>
          {pendientes > 0 && <Semaforo nivel="amarillo">Pendiente de enviar</Semaforo>}
        </span>
        <button type="button" className="btn btn--secundario" aria-pressed={cabina} onClick={alternarCabina}>
          {cabina ? 'Salir de modo cabina' : 'Modo cabina'}
        </button>
      </div>

      <AvisosDestacados cita={cita} />

      {terminada ? (
        <Atendido cita={cita} />
      ) : (
        tiempo && (
          <section className={`tarjeta ${s.tiempo}`} aria-labelledby="titulo-tiempo">
            <h1 id="titulo-tiempo" className={s.etiqueta}>
              Tiempo estimado de atención
            </h1>
            <p className={s.cifra} aria-live="polite">
              {tiempo.minutos}
              <small>min</small>
            </p>
            <p className={`${s.motivo} ${tiempo.delta !== 0 ? s.motivoCambio : ''}`}>{textoMotivoTiempo(tiempo)}</p>
            {!cabina && cita.tiempoEstimado.length > 1 && (
              <details className={s.historial}>
                <summary>Ver todos los cambios ({cita.tiempoEstimado.length})</summary>
                <ol>
                  {[...cita.tiempoEstimado].reverse().map((c) => (
                    <li key={c.en + c.minutos}>
                      <strong>
                        {textoHoraDe(new Date(c.en))} · {c.minutos} min
                      </strong>{' '}
                      — {textoMotivoTiempo(c)}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>
        )
      )}

      <dl className={s.claves}>
        <div className={s.clave}>
          <dt>Lugar en la fila</dt>
          {cita.estado === 'garita' || terminada ? (
            <dd>{cita.estado === 'garita' ? 'En garita' : '—'}</dd>
          ) : (
            <>
              <dd>{fila.lugar}.º</dd>
              <span>de {fila.total} en tu franja</span>
            </>
          )}
        </div>
        <div className={s.clave}>
          <dt>Posición</dt>
          {cita.posicion ? (
            <dd className={s.claveMono}>{cita.posicion.codigo}</dd>
          ) : (
            <>
              <dd>Por confirmar</dd>
              <span>la revisa el planificador</span>
            </>
          )}
        </div>
        <div className={s.clave}>
          <dt>Tu franja</dt>
          <dd>{textoFranja(cita.franja).replace('–', '–​')}</dd>
          <span>{textoDia(cita.fecha)}</span>
        </div>
      </dl>

      <LineaEstado cita={cita} />

      {!terminada && (
        <>
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
          {puedeReprogramar && (
            <>
              <Link to="/conductor/reprogramar" className="btn btn--secundario btn--grande btn--bloque">
                Reprogramar
              </Link>
              {!cabina && (
                <p className={s.leyenda}>¿Te atrasaste en la frontera o en la ruta? Cambia tu hora en un toque.</p>
              )}
            </>
          )}
        </>
      )}

      {!cabina && (
        <>
          <section className="tarjeta pila" aria-labelledby="titulo-detalle">
            <h2 id="titulo-detalle" style={{ margin: 0 }}>
              Tu cita
            </h2>
            <dl className={s.resumen}>
              <dt>Día y hora</dt>
              <dd>
                {textoDiaCompleto(cita.fecha)}, {textoFranja(cita.franja)}
              </dd>
              <dt>Contenedor</dt>
              <dd className="mono">{contenedor.id}</dd>
              <dt>Nave</dt>
              <dd>
                {nave.nombre} → {nombrePuerto(contenedor.puerto)}
              </dd>
              <dt>Patente</dt>
              <dd>{conductor.patente}</dd>
            </dl>
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

          <QrDosEquipos
            demo={demo}
            citaId={cita.id}
            texto="Para ver esta misma cita en otro equipo: en un celular, escanea el código con la cámara; en el notebook, usa «Leer QR del otro equipo» en el Panel de la demo."
          />

          <PieConductor demo={demo} />
        </>
      )}
    </div>
  );
}
