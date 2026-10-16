// Fase 1: vista previa del motor de asignación sobre las citas pendientes.
// La consola completa (mapa, aceptar/modificar, motivos) se construye en la Fase 4.

import { useMemo, useState } from 'react';
import { Semaforo } from '../../components/Semaforo';
import { asignar, type Prioridad, type Sugerencia } from '../../engine/assign';
import { momentoCalculo, textoDia, textoFechaHora, textoFranja } from '../../data/fechas';
import { contenedorAsignable, nombrePuerto } from '../../data/seed';
import { useDemo } from '../../data/store';
import s from './Planificador.module.css';

const NIVEL_PRIORIDAD: Record<Prioridad, 'rojo' | 'amarillo' | 'verde'> = {
  alta: 'rojo',
  media: 'amarillo',
  baja: 'verde',
};

function DetalleSugerencia({ sugerencia }: { sugerencia: Sugerencia }) {
  return (
    <ul className={s.criterios}>
      {sugerencia.criterios.map((c) => (
        <li key={c.clave}>
          <div className={s.criterioCabecera}>
            <span>{c.etiqueta}</span>
            <span>
              {c.puntos} / {c.max}
            </span>
          </div>
          <div className={s.barra} aria-hidden="true">
            <div className={s.barraRelleno} style={{ width: `${(c.puntos / c.max) * 100}%` }} />
          </div>
          <p className={s.criterioTexto}>{c.explicacion}</p>
        </li>
      ))}
    </ul>
  );
}

export function Planificador() {
  const demo = useDemo();
  const [citaId, setCitaId] = useState<string | null>(null);
  const ahora = momentoCalculo();

  const pendientes = useMemo(
    () =>
      (demo?.citas ?? [])
        .filter((c) => !c.posicion)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.franja - b.franja),
    [demo],
  );
  const seleccionada = pendientes.find((c) => c.id === citaId) ?? pendientes[0];

  const resultado = useMemo(() => {
    if (!demo || !seleccionada) return null;
    const contenedor = demo.contenedores.find((c) => c.id === seleccionada.contenedorId)!;
    return asignar({ contenedor: contenedorAsignable(demo, contenedor), patio: demo.patio, ahora });
  }, [demo, seleccionada, ahora]);

  if (!demo) return <p className="contenido">Cargando datos de la demo…</p>;

  return (
    <div className="contenido">
      <h1>Consola del planificador</h1>
      <div className={`tarjeta ${s.nota}`}>
        <strong>Vista previa del motor de asignación (Fase 1).</strong>{' '}
        <span className="texto-suave">
          Elige una cita pendiente para ver la posición sugerida y su porqué. El mapa del patio, los botones
          Aceptar/Modificar y los motivos se agregan en la Fase 4.
        </span>
      </div>

      <div className={s.rejilla}>
        <section className="tarjeta" aria-labelledby="titulo-cola">
          <h2 id="titulo-cola">Citas pendientes de posición ({pendientes.length})</h2>
          <div className={s.desplazable}>
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Contenedor</th>
                  <th scope="col">Nave</th>
                  <th scope="col">Destino</th>
                  <th scope="col">Peso</th>
                  <th scope="col">Franja</th>
                  <th scope="col"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((cita) => {
                  const cont = demo.contenedores.find((c) => c.id === cita.contenedorId)!;
                  const nave = demo.naves.find((n) => n.id === cont.naveId)!;
                  const activa = cita.id === seleccionada?.id;
                  return (
                    <tr key={cita.id} className={`${s.fila} ${activa ? s.filaActiva : ''}`}>
                      <td className="mono">{cont.id}</td>
                      <td>{nave.nombre}</td>
                      <td>{nombrePuerto(cont.puerto)}</td>
                      <td className={s.sinCorte}>{cont.pesoT.toLocaleString('es-CL')} t</td>
                      <td className={s.sinCorte}>
                        {textoFranja(cita.franja)}
                        <div className={s.leyenda}>{textoDia(cita.fecha)}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn ${activa ? 'btn--primario' : 'btn--secundario'}`}
                          aria-pressed={activa}
                          onClick={() => setCitaId(cita.id)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="tarjeta pila" aria-labelledby="titulo-sugerencia" aria-live="polite">
          {!resultado?.mejor ? (
            <p>No hay posición disponible para esta cita.</p>
          ) : (
            <>
              <div className={s.cabeceraSugerencia}>
                <div>
                  <h2 id="titulo-sugerencia">Posición sugerida</h2>
                  <p className={s.posicion}>{resultado.mejor.codigo}</p>
                  <span className={s.leyenda}>bloque – bahía – fila – nivel</span>
                </div>
                <div className={s.puntaje}>
                  <div className={s.puntajeNumero}>{resultado.mejor.puntaje}</div>
                  <span className={s.leyenda}>puntaje de 100</span>
                  <div>
                    <Semaforo nivel={NIVEL_PRIORIDAD[resultado.prioridad]}>
                      Prioridad {resultado.prioridad}
                    </Semaforo>
                  </div>
                </div>
              </div>

              <div>
                <h3>¿Por qué esta posición?</h3>
                <DetalleSugerencia sugerencia={resultado.mejor} />
              </div>

              <div>
                <h3>Alternativas</h3>
                <ul className={s.alternativas}>
                  {resultado.alternativas.map((a) => (
                    <li key={a.codigo} className={s.alternativa}>
                      <span className="mono">{a.codigo}</span>
                      <span>{a.puntaje} pts</span>
                    </li>
                  ))}
                </ul>
              </div>

              {resultado.descartados.length > 0 && (
                <div>
                  <h3>Bloques descartados</h3>
                  <ul>
                    {resultado.descartados.map((d) => (
                      <li key={d.bloque}>{d.detalle}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className={s.leyenda}>
                Calculado para el {textoFechaHora(ahora)} con {resultado.evaluadas} pilas evaluadas. Mismas
                condiciones, misma sugerencia.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
