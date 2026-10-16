// Paso 2 de la reserva (y pantalla de reprogramar): día y franja horaria con semáforo de cupos
// y una franja "Recomendada".

import { useMemo, useState } from 'react';
import { Semaforo } from '../../components/Semaforo';
import { enDia, fechaISO, textoDia, textoFechaCorta, textoFranja, textoHoraDe } from '../../data/fechas';
import { cierreRecepcion, franjasDelDia, motivoRecomendacion, textoCupos, type InfoFranja } from '../../data/franjas';
import type { Cita, Contenedor, DemoState } from '../../data/types';
import { textoError } from './comun';
import s from './Conductor.module.css';

const DIAS_A_MOSTRAR = 3;

interface Props {
  demo: DemoState;
  contenedor: Contenedor;
  /** Cita que se reprograma (su franja actual se marca y no se puede elegir). */
  cita?: Cita;
  textoConfirmar: string;
  onConfirmar: (fecha: string, franja: number) => Promise<void>;
}

function etiquetaFranja(f: InfoFranja): string {
  const partes = [`${textoFranja(f.hora)}`];
  if (f.actual) partes.push('tu franja actual');
  if (f.motivo === 'cierre') partes.push('después del cierre de la nave');
  else partes.push(textoCupos(f), `espera estimada ${f.esperaMin} minutos`);
  if (f.recomendada) partes.push('recomendada');
  return partes.join(', ');
}

export function SelectorFranja({ demo, contenedor, cita, textoConfirmar, onConfirmar }: Props) {
  const ahora = useMemo(() => new Date(), []);
  const nave = demo.naves.find((n) => n.id === contenedor.naveId)!;
  const cierre = useMemo(() => cierreRecepcion(nave), [nave]);
  const diaCierre = textoDia(fechaISO(cierre), ahora);
  const cuandoCierra = diaCierre === textoFechaCorta(fechaISO(cierre)) ? `el ${diaCierre}` : diaCierre.toLowerCase();

  const dias = useMemo(
    () =>
      Array.from({ length: DIAS_A_MOSTRAR }, (_, i) => {
        const fecha = fechaISO(enDia(ahora, i, 0));
        const franjas = franjasDelDia(demo, fecha, { ahora, cierre, reprogramando: cita });
        return { fecha, franjas, hay: franjas.some((f) => f.disponible && !f.actual) };
      }),
    [demo, ahora, cierre, cita],
  );

  // La franja recomendada queda preseleccionada: reservar es un toque en "Confirmar".
  const recomendadaDe = (fecha: string) =>
    dias.find((d) => d.fecha === fecha)?.franjas.find((f) => f.recomendada)?.hora ?? null;
  const fechaInicial =
    (cita && dias.find((d) => d.fecha === cita.fecha && d.hay)?.fecha) ?? dias.find((d) => d.hay)?.fecha ?? dias[0].fecha;

  const [fecha, setFecha] = useState(fechaInicial);
  const [elegida, setElegida] = useState<number | null>(() => recomendadaDe(fechaInicial));
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const dia = dias.find((d) => d.fecha === fecha)!;
  const visibles = dia.franjas.filter((f) => f.motivo !== 'pasada');
  const recomendada = dia.franjas.find((f) => f.recomendada);

  function cambiarDia(nueva: string) {
    setFecha(nueva);
    setError('');
    setElegida(recomendadaDe(nueva));
  }

  async function confirmar() {
    if (elegida === null) return;
    setEnviando(true);
    setError('');
    try {
      await onConfirmar(fecha, elegida);
    } catch (e) {
      setError(textoError(e));
      setEnviando(false);
    }
  }

  return (
    <section className="pila" aria-labelledby="titulo-franja">
      <h2 id="titulo-franja" style={{ margin: 0 }}>
        ¿Qué día y a qué hora llegas?
      </h2>

      <div className={s.dias} role="group" aria-label="Día">
        {dias.map((d) => (
          <button
            key={d.fecha}
            type="button"
            className={s.dia}
            aria-pressed={d.fecha === fecha}
            disabled={!d.hay}
            onClick={() => cambiarDia(d.fecha)}
          >
            <strong>{textoDia(d.fecha, ahora)}</strong>
            <span>{d.hay ? textoFechaCorta(d.fecha) : 'Sin horarios'}</span>
          </button>
        ))}
      </div>

      <p className={s.leyenda}>
        La recepción de {nave.nombre} cierra {cuandoCierra} a las {textoHoraDe(cierre)}.
      </p>

      {recomendada ? (
        <p className="aviso-info">
          <strong>Recomendada: {textoFranja(recomendada.hora)}.</strong>{' '}
          {cita?.fecha === fecha && recomendada.hora > cita.franja && 'Es más tarde que tu hora actual. '}
          {motivoRecomendacion(recomendada)}
        </p>
      ) : (
        <p className="aviso-info">No quedan horarios disponibles este día. Prueba con otro día.</p>
      )}

      <div className={s.franjas} role="group" aria-label="Franja horaria">
        {visibles.map((f) => {
          return (
            <button
              key={f.hora}
              type="button"
              className={`${s.franja} ${f.recomendada ? s.franjaRecomendada : ''}`}
              aria-pressed={elegida === f.hora}
              aria-label={etiquetaFranja(f)}
              disabled={!f.disponible || f.actual}
              onClick={() => {
                setElegida(f.hora);
                setError('');
              }}
            >
              {f.recomendada && (
                <span className={s.etiquetaRecomendada} aria-hidden="true">
                  ★ Recomendada
                </span>
              )}
              <span className={s.hora}>{textoFranja(f.hora)}</span>
              {f.motivo === 'cierre' ? (
                <span className={s.espera}>Después del cierre de la nave</span>
              ) : (
                <>
                  <Semaforo nivel={f.nivel}>{textoCupos(f)}</Semaforo>
                  <span className={s.espera}>Espera ~{f.esperaMin} min</span>
                </>
              )}
              {f.actual && <span className={s.etiquetaActual}>Tu franja actual</span>}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="aviso-error">
          {error}
        </p>
      )}

      <div className={s.accionFija}>
        <button
          type="button"
          className="btn btn--primario btn--grande btn--bloque"
          disabled={elegida === null || enviando}
          onClick={confirmar}
        >
          {elegida === null ? 'Elige una franja' : `${textoConfirmar} · ${textoFranja(elegida)}`}
        </button>
      </div>
    </section>
  );
}
