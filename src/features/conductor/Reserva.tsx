// Reserva de cita en 2 pasos: (1) guía por QR, a mano o de ejemplo; (2) día y franja.

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LectorQr } from '../../components/LectorQr';
import { motivoNoReservable } from '../../data/acciones';
import { buscarPorGuia, leerTextoGuia, type LecturaGuia } from '../../data/qr';
import { EJEMPLOS } from '../../data/seed';
import { store } from '../../data/store';
import type { Conductor, DemoState } from '../../data/types';
import { PieConductor, Pasos, ResumenContenedor, conductorActual } from './comun';
import { SelectorFranja } from './SelectorFranja';
import s from './Conductor.module.css';

function PasoGuia({
  demo,
  conductor,
  onElegido,
}: {
  demo: DemoState;
  conductor: Conductor;
  onElegido: (contenedorId: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const ejemplo = conductor.nacionalidad === 'BO' ? EJEMPLOS.boliviano : EJEMPLOS.nacional;

  function usar(lectura: LecturaGuia | null) {
    if (!lectura) return setError('Eso no parece una guía ni un número de contenedor.');
    const contenedor = buscarPorGuia(demo, lectura);
    if (!contenedor) return setError('No encontramos esa guía en los datos de la demo.');
    const motivo = motivoNoReservable(demo, contenedor.id);
    if (motivo) return setError(motivo);
    setError('');
    onElegido(contenedor.id);
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    usar(leerTextoGuia(texto));
  }

  return (
    <section className="pila" aria-labelledby="titulo-guia">
      <h1 id="titulo-guia" style={{ margin: 0 }}>
        Reserva tu cita
      </h1>
      <p style={{ margin: 0 }}>Escanea el código QR de tu guía de despacho.</p>

      <LectorQr onLeido={(t) => usar(leerTextoGuia(t))} />

      <div className={s.separador}>o escribe el número</div>
      <form onSubmit={buscar} className="pila" style={{ gap: 8 }}>
        <label htmlFor="numero-guia" className={s.campo}>
          N° de contenedor o de guía
        </label>
        <div className={s.fila}>
          <input
            id="numero-guia"
            className={s.entrada}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder={ejemplo.contenedorId}
          />
          <button type="submit" className="btn btn--secundario btn--grande">
            Buscar
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="aviso-error">
          {error}
        </p>
      )}

      <div className={s.separador}>¿Sin guía a mano?</div>
      <button
        type="button"
        className="btn btn--acento btn--grande btn--bloque"
        onClick={() => usar({ contenedor: ejemplo.contenedorId })}
      >
        Usar guía de ejemplo
      </button>
      <p className={s.leyenda}>
        Para probar el escáner, <Link to="/guia-ejemplo" target="_blank">abre la guía de ejemplo en otra pantalla</Link>{' '}
        y escanéala con este teléfono.
      </p>
    </section>
  );
}

export function Reserva({ demo }: { demo: DemoState }) {
  const navigate = useNavigate();
  const [contenedorId, setContenedorId] = useState<string | null>(null);
  const conductor = conductorActual(demo)!;
  const contenedor = demo.contenedores.find((c) => c.id === contenedorId);
  const nave = contenedor && demo.naves.find((n) => n.id === contenedor.naveId);

  async function reservar(fecha: string, franja: number) {
    await store.reservarCita({ contenedorId: contenedor!.id, conductorId: conductor.id, fecha, franja });
    navigate('/conductor/cita', { state: { aviso: 'reservada' } });
  }

  return (
    <div className={s.pantalla}>
      <Pasos actual={contenedor ? 2 : 1} />
      {contenedor && nave ? (
        <>
          <section className="tarjeta pila" aria-label="Tu contenedor">
            <ResumenContenedor contenedor={contenedor} nave={nave} />
            <button type="button" className="btn btn--secundario" onClick={() => setContenedorId(null)}>
              Cambiar guía
            </button>
          </section>
          <SelectorFranja demo={demo} contenedor={contenedor} textoConfirmar="Confirmar reserva" onConfirmar={reservar} />
        </>
      ) : (
        <PasoGuia demo={demo} conductor={conductor} onElegido={setContenedorId} />
      )}
      <PieConductor demo={demo} />
    </div>
  );
}
