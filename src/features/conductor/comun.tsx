// Piezas compartidas por las pantallas del conductor.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { nombrePuerto } from '../../data/seed';
import { store } from '../../data/store';
import type { Cita, Conductor, Contenedor, DemoState, Nave } from '../../data/types';
import s from './Conductor.module.css';

export interface DatosCita {
  cita: Cita;
  contenedor: Contenedor;
  nave: Nave;
  conductor: Conductor;
}

export function datosCita(demo: DemoState, cita: Cita): DatosCita {
  const contenedor = demo.contenedores.find((c) => c.id === cita.contenedorId)!;
  return {
    cita,
    contenedor,
    nave: demo.naves.find((n) => n.id === contenedor.naveId)!,
    conductor: demo.conductores.find((c) => c.id === cita.conductorId)!,
  };
}

export function conductorActual(demo: DemoState): Conductor | undefined {
  return demo.conductores.find((c) => c.id === demo.dispositivo.conductorId);
}

export function citaActual(demo: DemoState): Cita | undefined {
  return demo.citas.find((c) => c.id === demo.dispositivo.citaId);
}

/** Mensaje de error legible a partir de lo que lance el store. */
export function textoError(error: unknown): string {
  return error instanceof Error ? error.message : 'Algo salió mal. Prueba de nuevo.';
}

export function Pasos({ actual }: { actual: 1 | 2 }) {
  const pasos = ['Tu guía', 'Día y hora'];
  return (
    <ol className={s.pasos} aria-label={`Paso ${actual} de 2`}>
      {pasos.map((nombre, i) => {
        const n = i + 1;
        const clase = n === actual ? s.pasoActual : n < actual ? s.pasoHecho : '';
        return (
          <li key={nombre} className={`${s.paso} ${clase}`} aria-current={n === actual ? 'step' : undefined}>
            {n < actual ? '✓ ' : `${n}. `}
            {nombre}
          </li>
        );
      })}
    </ol>
  );
}

export function ResumenContenedor({ contenedor, nave }: { contenedor: Contenedor; nave: Nave }) {
  return (
    <dl className={s.resumen}>
      <dt>Contenedor</dt>
      <dd className="mono">{contenedor.id}</dd>
      <dt>Nave</dt>
      <dd>{nave.nombre}</dd>
      <dt>Destino</dt>
      <dd>{nombrePuerto(contenedor.puerto)}</dd>
      <dt>Peso</dt>
      <dd>
        {contenedor.pesoT.toLocaleString('es-CL')} t · {contenedor.tipo} pies
      </dd>
    </dl>
  );
}

/** Pie del modo conductor: quién usa el teléfono, cambiar de conductor y "Borrar mis datos". */
export function PieConductor({ demo }: { demo: DemoState }) {
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const conductor = conductorActual(demo);

  async function borrar() {
    await store.borrarMisDatos();
    navigate('/conductor', { replace: true, state: { borrado: true } });
  }

  return (
    <footer className={s.pie}>
      {conductor && (
        <p className={s.leyenda} style={{ width: '100%' }}>
          Conductor de ejemplo: <strong>{conductor.nombre}</strong> · patente {conductor.patente}
        </p>
      )}
      {confirmando ? (
        <div className="pila" style={{ width: '100%' }}>
          <p role="alert" className="aviso-info">
            Se borrarán de este teléfono tu consentimiento, tu identificación y el enlace a tu cita.
          </p>
          <button type="button" className="btn btn--peligro btn--grande" onClick={borrar}>
            Sí, borrar mis datos
          </button>
          <button type="button" className="btn btn--secundario btn--grande" onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <Link to="/conductor/quien" className="btn btn--secundario">
            Cambiar conductor
          </Link>
          <button type="button" className="btn btn--peligro" onClick={() => setConfirmando(true)}>
            Borrar mis datos
          </button>
        </>
      )}
    </footer>
  );
}
