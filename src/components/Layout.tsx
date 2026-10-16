import { Link, Outlet, useLocation } from 'react-router-dom';
import { BannerConexion } from './BannerConexion';
import { BotonReiniciar } from './BotonReiniciar';
import s from './Layout.module.css';

const SECCIONES: [prefijo: string, nombre: string][] = [
  ['/conductor', 'Conductor'],
  ['/planificador', 'Planificador de patio'],
  ['/indicadores', 'Indicadores del turno'],
  ['/demo', 'Panel de la demo'],
  ['/guia-ejemplo', 'Guías de ejemplo'],
];

export function Layout() {
  const { pathname } = useLocation();
  const seccion = SECCIONES.find(([prefijo]) => pathname.startsWith(prefijo))?.[1];

  return (
    <div className={s.marco}>
      <header className={s.cabecera}>
        <div className={s.barra}>
          <Link to="/" className={s.marca} aria-label="SIAP-TPA, volver al inicio">
            <span className={s.sigla}>SIAP-TPA</span>
            <span className={s.terminal}>Terminal Puerto Arica</span>
          </Link>
          {seccion && <span className={s.seccion}>{seccion}</span>}
        </div>
      </header>
      <p className={s.aviso} role="note">
        Prototipo de demostración, datos simulados
      </p>
      <BannerConexion />
      <main className={s.principal} id="contenido">
        <Outlet />
      </main>
      <footer className={s.pie}>
        <div className={s.pieInterior}>
          <span>Prototipo académico · Innovación y Emprendimiento III · INACAP Arica</span>
          <span className={s.pieAcciones}>
            <Link to="/demo" className="btn btn--secundario">
              Panel de la demo
            </Link>
            <BotonReiniciar />
          </span>
        </div>
      </footer>
    </div>
  );
}
