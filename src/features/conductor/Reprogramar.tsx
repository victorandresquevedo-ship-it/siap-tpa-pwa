import { Link, Navigate, useNavigate } from 'react-router-dom';
import { textoDiaCompleto, textoFranja } from '../../data/fechas';
import { store } from '../../data/store';
import type { DemoState } from '../../data/types';
import { citaActual, datosCita } from './comun';
import { SelectorFranja } from './SelectorFranja';
import s from './Conductor.module.css';

export function Reprogramar({ demo }: { demo: DemoState }) {
  const navigate = useNavigate();
  const actual = citaActual(demo);
  if (!actual) return <Navigate to="/conductor" replace />;
  const { cita, contenedor } = datosCita(demo, actual);

  async function reprogramar(fecha: string, franja: number) {
    await store.reprogramarCita(cita.id, fecha, franja);
    navigate('/conductor/cita', { state: { aviso: 'reprogramada' } });
  }

  return (
    <div className={s.pantalla}>
      <section className="pila" aria-labelledby="titulo-reprogramar" style={{ gap: 8 }}>
        <h1 id="titulo-reprogramar" style={{ margin: 0 }}>
          Reprogramar cita
        </h1>
        <p style={{ margin: 0 }}>
          Tu cita actual: <strong>{textoDiaCompleto(cita.fecha)}, {textoFranja(cita.franja)}</strong>. Elige el
          nuevo horario.
        </p>
      </section>
      <SelectorFranja
        demo={demo}
        contenedor={contenedor}
        cita={cita}
        textoConfirmar="Cambiar a"
        onConfirmar={reprogramar}
      />
      <Link to="/conductor/cita" className="btn btn--secundario btn--grande btn--bloque">
        Volver sin cambios
      </Link>
    </div>
  );
}
