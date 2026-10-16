// Panel de la demo: simula lo que haría la terminal (planificador, garita, naves) para mostrar
// el seguimiento del conductor durante la presentación, y mueve citas entre dos equipos por QR.

import { useMemo, useState } from 'react';
import { LectorQr } from '../../components/LectorQr';
import { QrDosEquipos } from '../../components/QrDosEquipos';
import { asignar } from '../../engine/assign';
import { momentoCalculo, textoDia, textoFranja } from '../../data/fechas';
import { extraerPaquete } from '../../data/paquete';
import { contenedorAsignable } from '../../data/seed';
import { ORDEN_ESTADOS, TEXTO_ESTADO, textoMotivoTiempo, tiempoVigente } from '../../data/seguimiento';
import { store, useDemo } from '../../data/store';
import { TEXTO_MOTIVO, type EstadoCita } from '../../data/types';
import { MINUTOS_EMBARQUE_ADELANTADO } from '../../data/acciones';
import s from './PanelDemo.module.css';

const TEXTO_HITO: Partial<Record<EstadoCita, string>> = {
  en_ruta: 'Salió: en ruta',
  antepuerto: 'Llegó al antepuerto',
  garita: 'Ingresó por garita',
};

const HORAS_ADELANTO = 12;

export function PanelDemo() {
  const demo = useDemo();
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [leyendo, setLeyendo] = useState(false);

  const citas = useMemo(
    () => [...(demo?.citas ?? [])].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)),
    [demo],
  );
  const citaId = elegidaId ?? demo?.dispositivo.citaId ?? citas[0]?.id;
  const cita = demo?.citas.find((c) => c.id === citaId);

  const sugerencia = useMemo(() => {
    if (!demo || !cita || cita.estado === 'atendido') return null;
    const contenedor = demo.contenedores.find((c) => c.id === cita.contenedorId)!;
    return asignar({ contenedor: contenedorAsignable(demo, contenedor), patio: demo.patio, ahora: momentoCalculo() });
  }, [demo, cita]);

  if (!demo) return <p className="contenido">Cargando datos de la demo…</p>;

  async function hacer(accion: () => Promise<unknown>, exito: string) {
    try {
      await accion();
      setMensaje({ tipo: 'ok', texto: exito });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo hacer.' });
    }
  }

  const contenedor = cita && demo.contenedores.find((c) => c.id === cita.contenedorId)!;
  const nave = contenedor && demo.naves.find((n) => n.id === contenedor.naveId)!;
  const conductor = cita && demo.conductores.find((c) => c.id === cita.conductorId)!;
  const tiempo = cita && tiempoVigente(cita);
  const siguiente = cita ? ORDEN_ESTADOS[ORDEN_ESTADOS.indexOf(cita.estado) + 1] : undefined;
  const alternativa = sugerencia?.alternativas.find((a) => a.codigo !== cita?.posicion?.codigo);

  return (
    <div className="contenido">
      <h1>Panel de la demo</h1>
      <p className="texto-suave">
        Simula lo que haría la terminal (planificador, garita y naves) para mostrar en vivo el seguimiento del
        conductor. Solo para la presentación.
      </p>

      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={mensaje.tipo === 'error' ? 'aviso-error' : 'aviso-ok'}>
          {mensaje.texto}
        </p>
      )}

      <div className={s.rejilla}>
        <section className="tarjeta pila" aria-labelledby="titulo-cita-demo">
          <h2 id="titulo-cita-demo" style={{ margin: 0 }}>
            Cita
          </h2>
          <label className={s.campo}>
            Cita a controlar
            <select
              className={s.selector}
              value={citaId ?? ''}
              onChange={(e) => {
                setElegidaId(e.target.value);
                setMensaje(null);
              }}
            >
              {citas.map((c) => {
                const cond = demo.conductores.find((x) => x.id === c.conductorId)!;
                return (
                  <option key={c.id} value={c.id}>
                    {c.id} · {cond.nombre} · {textoDia(c.fecha)} {textoFranja(c.franja)} · {TEXTO_ESTADO[c.estado]}
                    {c.id === demo.dispositivo.citaId ? ' (este teléfono)' : ''}
                  </option>
                );
              })}
            </select>
          </label>
          {cita && contenedor && nave && conductor && (
            <dl className={s.datos}>
              <dt>Conductor</dt>
              <dd>
                {conductor.nombre} ({conductor.patente})
              </dd>
              <dt>Contenedor</dt>
              <dd className="mono">{contenedor.id}</dd>
              <dt>Nave</dt>
              <dd>{nave.nombre}</dd>
              <dt>Estado</dt>
              <dd>{TEXTO_ESTADO[cita.estado]}</dd>
              <dt>Posición</dt>
              <dd className={cita.posicion ? 'mono' : undefined}>{cita.posicion?.codigo ?? 'Por confirmar'}</dd>
              <dt>Tiempo</dt>
              <dd>{tiempo ? `${tiempo.minutos} min · ${textoMotivoTiempo(tiempo)}` : '—'}</dd>
            </dl>
          )}
        </section>

        {cita && nave && (
          <div className="pila">
            <section className="tarjeta pila" aria-labelledby="titulo-planificador-demo">
              <h2 id="titulo-planificador-demo" style={{ margin: 0 }}>
                Planificador
              </h2>
              {sugerencia?.mejor ? (
                <>
                  <button
                    type="button"
                    className="btn btn--primario"
                    disabled={cita.posicion?.codigo === sugerencia.mejor.codigo}
                    onClick={() =>
                      hacer(
                        () =>
                          store.decidirPosicion(cita.id, {
                            codigo: sugerencia.mejor!.codigo,
                            sugerida: sugerencia.mejor!.codigo,
                            puntaje: sugerencia.mejor!.puntaje,
                          }),
                        `Posición ${sugerencia.mejor!.codigo} aceptada.`,
                      )
                    }
                  >
                    Aceptar sugerencia {sugerencia.mejor.codigo}
                  </button>
                  {alternativa && (
                    <button
                      type="button"
                      className="btn btn--secundario"
                      onClick={() =>
                        hacer(
                          () =>
                            store.decidirPosicion(cita.id, {
                              codigo: alternativa.codigo,
                              sugerida: sugerencia.mejor!.codigo,
                              puntaje: alternativa.puntaje,
                              motivo: 'bloque_lleno',
                            }),
                          `Posición cambiada a ${alternativa.codigo} (${TEXTO_MOTIVO.bloque_lleno}).`,
                        )
                      }
                    >
                      Cambiar a {alternativa.codigo} · motivo: {TEXTO_MOTIVO.bloque_lleno}
                    </button>
                  )}
                </>
              ) : (
                <p className="texto-suave">Esta cita ya no necesita posición.</p>
              )}
            </section>

            <section className="tarjeta pila" aria-labelledby="titulo-hitos-demo">
              <h2 id="titulo-hitos-demo" style={{ margin: 0 }}>
                Hitos del camión
              </h2>
              {siguiente === 'atendido' ? (
                <div className={s.botones}>
                  {[true, false].map((dentro) => (
                    <button
                      key={String(dentro)}
                      type="button"
                      className={`btn ${dentro ? 'btn--primario' : 'btn--secundario'}`}
                      onClick={() =>
                        hacer(
                          () => store.registrarHito(cita.id, 'atendido', { dentroDeFranja: dentro }),
                          `Cita ${cita.id} atendida ${dentro ? 'dentro' : 'fuera'} de su franja.`,
                        )
                      }
                    >
                      Atendido {dentro ? 'dentro' : 'fuera'} de la franja
                    </button>
                  ))}
                </div>
              ) : siguiente ? (
                <button
                  type="button"
                  className="btn btn--primario"
                  onClick={() =>
                    hacer(() => store.registrarHito(cita.id, siguiente), `Hito registrado: ${TEXTO_ESTADO[siguiente]}.`)
                  }
                >
                  Registrar: {TEXTO_HITO[siguiente]}
                </button>
              ) : (
                <p className="texto-suave">El camión ya fue atendido.</p>
              )}
            </section>

            <section className="tarjeta pila" aria-labelledby="titulo-nave-demo">
              <h2 id="titulo-nave-demo" style={{ margin: 0 }}>
                Nave
              </h2>
              <button
                type="button"
                className="btn btn--acento"
                onClick={() =>
                  hacer(
                    () => store.adelantarEmbarque(nave.id, HORAS_ADELANTO),
                    `${nave.nombre} adelantó su embarque ${HORAS_ADELANTO} h.`,
                  )
                }
              >
                {nave.nombre} adelanta su embarque {HORAS_ADELANTO} h
              </button>
              <p className="texto-suave" style={{ margin: 0 }}>
                Sus camiones pendientes suman {MINUTOS_EMBARQUE_ADELANTADO} min, con el motivo a la vista.
              </p>
            </section>
          </div>
        )}

        <section className="tarjeta pila" aria-labelledby="titulo-dos-equipos">
          <h2 id="titulo-dos-equipos" style={{ margin: 0 }}>
            Dos equipos sin servidor
          </h2>
          {cita && (
            <QrDosEquipos
              demo={demo}
              citaId={cita.id}
              texto={`Escanea este código con la cámara del celular para cargar la cita ${cita.id} allá.`}
            />
          )}
          <button
            type="button"
            className="btn btn--secundario btn--grande btn--bloque"
            aria-expanded={leyendo}
            onClick={() => setLeyendo((v) => !v)}
          >
            {leyendo ? 'Cerrar lector' : 'Leer QR del otro equipo'}
          </button>
          {leyendo && (
            <LectorQr
              onLeido={(texto) =>
                hacer(async () => {
                  const nueva = await store.importarCita(extraerPaquete(texto), { comoConductor: false });
                  setElegidaId(nueva.id);
                  setLeyendo(false);
                }, 'Cita cargada desde el otro equipo.')
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
