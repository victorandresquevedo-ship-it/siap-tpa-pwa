import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { store } from '../../data/store';
import s from './Conductor.module.css';

/** Pantalla breve de consentimiento (Ley 21.719) antes de usar el modo conductor. */
export function Consentimiento() {
  const { state } = useLocation();
  const borrado = (state as { borrado?: boolean } | null)?.borrado;
  const [enviando, setEnviando] = useState(false);

  async function aceptar() {
    setEnviando(true);
    await store.aceptarConsentimiento();
  }

  return (
    <div className={s.pantalla}>
      {borrado && (
        <p role="status" className="aviso-ok">
          Listo: tus datos se borraron de este teléfono.
        </p>
      )}
      <section className="tarjeta pila" aria-labelledby="titulo-consentimiento">
        <h1 id="titulo-consentimiento">Antes de empezar</h1>
        <p>Para reservar y seguir tu cita, SIAP-TPA usa estos datos tuyos:</p>
        <dl className={s.resumen}>
          <dt>Nombre</dt>
          <dd>para identificarte en garita</dd>
          <dt>Patente</dt>
          <dd>para reconocer tu camión al ingreso</dd>
          <dt>Teléfono</dt>
          <dd>para enviarte la confirmación por SMS</dd>
        </dl>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            Solo registramos <strong>hitos</strong> de tu viaje: cuando llegas al antepuerto y a la garita.
          </li>
          <li>
            <strong>Nunca</strong> usamos tu ubicación continua (GPS).
          </li>
          <li>Tus datos quedan en este teléfono. En esta demo no se envían a ningún servicio externo.</li>
          <li>Puedes borrarlos cuando quieras con el botón «Borrar mis datos».</li>
        </ul>
        <p className={s.leyenda}>Ley 21.719 de protección de datos personales (Chile).</p>
        <button type="button" className="btn btn--primario btn--grande btn--bloque" onClick={aceptar} disabled={enviando}>
          Acepto, continuar
        </button>
        <Link to="/" className="btn btn--secundario btn--grande btn--bloque">
          No, volver al inicio
        </Link>
      </section>
    </div>
  );
}
