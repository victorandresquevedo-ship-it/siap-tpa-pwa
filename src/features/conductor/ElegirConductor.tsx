import { useNavigate } from 'react-router-dom';
import { EJEMPLOS } from '../../data/seed';
import { store } from '../../data/store';
import type { DemoState } from '../../data/types';
import s from './Conductor.module.css';

const OPCIONES = [
  { conductorId: EJEMPLOS.boliviano.conductorId, tipo: 'Conductor boliviano' },
  { conductorId: EJEMPLOS.nacional.conductorId, tipo: 'Conductor nacional' },
];

/** Selector rápido de conductor de ejemplo (boliviano / nacional). */
export function ElegirConductor({ demo }: { demo: DemoState }) {
  const navigate = useNavigate();

  async function elegir(conductorId: string) {
    await store.elegirConductor(conductorId);
    navigate('/conductor', { replace: true });
  }

  return (
    <div className={s.pantalla}>
      <section className="pila" aria-labelledby="titulo-quien">
        <h1 id="titulo-quien">¿Quién maneja hoy?</h1>
        <p className="texto-suave" style={{ margin: 0 }}>
          Elige un conductor de ejemplo para la demo.
        </p>
        <div className={s.opciones}>
          {OPCIONES.map(({ conductorId, tipo }) => {
            const c = demo.conductores.find((x) => x.id === conductorId)!;
            const iniciales = c.nombre
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('');
            return (
              <button key={conductorId} type="button" className={s.opcion} onClick={() => elegir(conductorId)}>
                <span className={s.inicial} aria-hidden="true">
                  {iniciales}
                </span>
                <span>
                  <strong>{c.nombre}</strong>
                  <span className="texto-suave">
                    {tipo} · <span style={{ whiteSpace: 'nowrap' }}>patente {c.patente}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
