// Panel de la cita elegida: posición sugerida en coordenada Baroti, "¿Por qué esta posición?",
// dos alternativas y Aceptar / Modificar (con el motivo en un toque).

import { QrDosEquipos } from '../../components/QrDosEquipos';
import { Semaforo } from '../../components/Semaforo';
import type { Prioridad, ResultadoAsignacion, Sugerencia } from '../../engine/assign';
import { textoDia, textoFechaHora, textoFranja } from '../../data/fechas';
import { nombrePuerto } from '../../data/seed';
import { TEXTO_ESTADO } from '../../data/seguimiento';
import { TEXTO_MOTIVO, type Cita, type DemoState, type MotivoCambio } from '../../data/types';
import s from './Planificador.module.css';

const NIVEL_PRIORIDAD: Record<Prioridad, 'rojo' | 'amarillo' | 'verde'> = {
  alta: 'rojo',
  media: 'amarillo',
  baja: 'verde',
};

const MOTIVOS: MotivoCambio[] = ['bloque_lleno', 'mantencion', 'pedido_patio', 'otro'];

export type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null;

interface Props {
  demo: DemoState;
  cita: Cita;
  resultado: ResultadoAsignacion;
  ahora: string;
  eligiendo: boolean;
  elegida: Sugerencia | null;
  mensaje: Mensaje;
  /** Se acaba de decidir la posición de esta cita (muestra el QR para el celular). */
  decidida: boolean;
  hayPendientes: boolean;
  onAceptar: () => void;
  onModificar: () => void;
  onElegir: (s: Sugerencia) => void;
  onMotivo: (m: MotivoCambio) => void;
  onCancelar: () => void;
  onSiguiente: () => void;
}

function PorQue({ sugerencia }: { sugerencia: Sugerencia }) {
  return (
    <ul className={s.criterios}>
      {sugerencia.criterios.map((c) => (
        <li key={c.clave}>
          <div className={s.criterioCabecera}>
            <span>{c.etiqueta}</span>
            <span>
              +{c.puntos} / {c.max}
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

export function PanelSugerencia(p: Props) {
  const { demo, cita, resultado, eligiendo, elegida, mensaje } = p;
  const contenedor = demo.contenedores.find((c) => c.id === cita.contenedorId)!;
  const nave = demo.naves.find((n) => n.id === contenedor.naveId)!;
  const conductor = demo.conductores.find((c) => c.id === cita.conductorId)!;
  const mejor = resultado.mejor;
  const yaAsignada = !!mejor && cita.posicion?.codigo === mejor.codigo;

  return (
    <section className="tarjeta pila" aria-labelledby="titulo-sugerencia" aria-live="polite">
      <div className={s.datosCita}>
        <span>
          <strong className="mono">{contenedor.id}</strong>
        </span>
        <span>
          <strong>{nave.nombre}</strong> → {nombrePuerto(contenedor.puerto)}
        </span>
        <span>{contenedor.pesoT.toLocaleString('es-CL')} t</span>
        <span>
          {textoDia(cita.fecha)} {textoFranja(cita.franja)}
        </span>
        <span>
          {conductor.nombre} ({conductor.nacionalidad === 'BO' ? 'boliviano' : 'nacional'}) · {TEXTO_ESTADO[cita.estado]}
        </span>
      </div>

      {cita.posicion && (
        <p className="aviso-info">
          Posición actual: <strong className="mono">{cita.posicion.codigo}</strong> (
          {cita.posicion.decision === 'aceptada'
            ? 'sugerencia aceptada'
            : `modificada: ${TEXTO_MOTIVO[cita.posicion.motivo ?? 'otro']}`}
          ).
        </p>
      )}

      {!mejor ? (
        <>
          <h2 id="titulo-sugerencia">Sin posición disponible</h2>
          <ul>
            {resultado.descartados.map((d) => (
              <li key={d.bloque}>{d.detalle}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className={s.cabeceraSugerencia}>
            <div>
              <h2 id="titulo-sugerencia" style={{ margin: 0 }}>
                Posición sugerida
              </h2>
              <p className={s.posicion}>{mejor.codigo}</p>
              <span className={s.leyenda}>bloque – bahía – fila – nivel</span>
            </div>
            <div className={s.puntaje}>
              <div className={s.puntajeNumero}>{mejor.puntaje}</div>
              <span className={s.leyenda}>puntaje de 100</span>
              <div>
                <Semaforo nivel={NIVEL_PRIORIDAD[resultado.prioridad]}>Prioridad {resultado.prioridad}</Semaforo>
              </div>
            </div>
          </div>

          <div>
            <h3>¿Por qué esta posición?</h3>
            <PorQue sugerencia={mejor} />
          </div>

          <div className="pila" style={{ gap: 8 }}>
            <h3 style={{ margin: 0 }}>Alternativas</h3>
            <div className={s.alternativas}>
              {resultado.alternativas.map((a, i) => (
                <button
                  key={a.codigo}
                  type="button"
                  className={s.alternativa}
                  aria-pressed={elegida?.codigo === a.codigo}
                  onClick={() => p.onElegir(a)}
                >
                  <span className={s.leyenda}>Alternativa {i + 1}</span>
                  <span className={s.alternativaCodigo}>{a.codigo}</span>
                  <span>
                    {a.puntaje} pts · {mejor.puntaje - a.puntaje} menos
                  </span>
                </button>
              ))}
            </div>
          </div>

          {elegida ? (
            <div className={s.cajaMotivo} role="group" aria-labelledby="titulo-motivo">
              <p id="titulo-motivo">
                <strong>
                  Cambiar a <span className="mono">{elegida.codigo}</span> ({elegida.puntaje} pts).
                </strong>{' '}
                ¿Por qué? Un toque y queda asignada:
              </p>
              <div className={s.motivos}>
                {MOTIVOS.map((m) => (
                  <button key={m} type="button" className="btn btn--primario btn--grande" onClick={() => p.onMotivo(m)}>
                    {TEXTO_MOTIVO[m]}
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn--secundario" onClick={p.onCancelar}>
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <div className={s.acciones}>
                <button
                  type="button"
                  className="btn btn--primario btn--grande"
                  disabled={yaAsignada}
                  onClick={p.onAceptar}
                >
                  {yaAsignada ? 'Ya asignada' : `Aceptar ${mejor.codigo}`}
                </button>
                <button
                  type="button"
                  className="btn btn--secundario btn--grande"
                  aria-pressed={eligiendo}
                  onClick={eligiendo ? p.onCancelar : p.onModificar}
                >
                  {eligiendo ? 'Cancelar' : 'Modificar'}
                </button>
              </div>
              {eligiendo && (
                <p className="aviso-info">Elige una alternativa o toca una pila con borde azul en el mapa del patio.</p>
              )}
            </>
          )}
        </>
      )}

      {mensaje && (
        <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className={mensaje.tipo === 'error' ? 'aviso-error' : 'aviso-ok'}>
          {mensaje.texto}
        </p>
      )}

      {p.decidida && (
        <>
          <QrDosEquipos
            demo={demo}
            citaId={cita.id}
            texto="Si el conductor usa otro teléfono, que escanee este código con la cámara para recibir el cambio."
          />
          {p.hayPendientes && (
            <button type="button" className="btn btn--secundario" onClick={p.onSiguiente}>
              Siguiente cita pendiente →
            </button>
          )}
        </>
      )}

      {mejor && resultado.descartados.length > 0 && (
        <details>
          <summary className={s.leyenda} style={{ cursor: 'pointer', minHeight: 32 }}>
            Bloques descartados ({resultado.descartados.length})
          </summary>
          <ul style={{ margin: '6px 0 0' }}>
            {resultado.descartados.map((d) => (
              <li key={d.bloque}>{d.detalle}</li>
            ))}
          </ul>
        </details>
      )}

      <p className={s.leyenda}>
        Calculado para el {textoFechaHora(p.ahora)} con {resultado.evaluadas} pilas evaluadas. Mismas condiciones,
        misma sugerencia.
      </p>
    </section>
  );
}
