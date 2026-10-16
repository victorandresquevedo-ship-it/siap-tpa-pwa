// Abre el enlace del QR "Modo demo dos dispositivos" (/importar#d=...) y carga la cita en este teléfono.

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extraerPaquete } from '../../data/paquete';
import { store } from '../../data/store';
import { textoError } from './comun';
import s from './Conductor.module.css';

export function Importar() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    const hash = window.location.hash;
    // Se borra el código de la barra de direcciones apenas se lee.
    window.history.replaceState(null, '', window.location.pathname);
    (async () => {
      try {
        await store.iniciar();
        await store.importarCita(extraerPaquete(hash));
        navigate('/conductor/cita', { replace: true, state: { aviso: 'importada' } });
      } catch (e) {
        setError(textoError(e));
      }
    })();
  }, [navigate]);

  return (
    <div className={s.pantalla}>
      {error ? (
        <div className="pila">
          <h1>No pudimos cargar la cita</h1>
          <p role="alert" className="aviso-error">
            {error}
          </p>
          <Link to="/" className="btn btn--primario btn--grande btn--bloque">
            Ir al inicio
          </Link>
        </div>
      ) : (
        <p role="status">Cargando la cita…</p>
      )}
    </div>
  );
}
