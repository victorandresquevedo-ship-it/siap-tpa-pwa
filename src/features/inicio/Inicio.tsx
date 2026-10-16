import { Link } from 'react-router-dom';
import { IconoBalanza, IconoCamion, IconoConsola, IconoIndicadores, IconoReloj, IconoSenal } from '../../components/Iconos';
import { useDemo } from '../../data/store';
import s from './Inicio.module.css';

const MODOS = [
  {
    a: '/conductor',
    titulo: 'Soy conductor',
    texto: 'Reserva tu cita en 2 pasos y sigue tu atención desde la cabina, incluso sin señal.',
    icono: <IconoCamion size={30} />,
  },
  {
    a: '/planificador',
    titulo: 'Soy planificador de patio',
    texto: 'Posición sugerida para cada contenedor, con el porqué y dos alternativas.',
    icono: <IconoConsola size={30} />,
  },
  {
    a: '/indicadores',
    titulo: 'Ver indicadores del turno',
    texto: 'Tiempo de atención, sugerencias aceptadas, cumplimiento de franja y más.',
    icono: <IconoIndicadores size={30} />,
  },
];

const ATRIBUTOS = [
  {
    titulo: 'Anticipado y reprogramable',
    texto: 'El conductor sabe su hora antes de salir y puede reprogramar en un toque.',
    icono: <IconoReloj />,
  },
  {
    titulo: 'Estándar y explicable',
    texto: 'Ante las mismas condiciones la sugerencia es siempre la misma, y el planificador ve el porqué.',
    icono: <IconoBalanza />,
  },
  {
    titulo: 'Transparente aun sin señal',
    texto: 'Conductor y terminal ven lo mismo, y la app sigue funcionando sin internet.',
    icono: <IconoSenal />,
  },
];

export function Inicio() {
  const demo = useDemo();

  return (
    <div className="contenido">
      <section className={s.portada} aria-labelledby="titulo-inicio">
        <h1 id="titulo-inicio" className={s.titulo}>SIAP-TPA</h1>
        <p className={s.bajada}>
          Sistema Integrado de Asignación y Programación del Patio de Terminal Puerto Arica.
          Elige cómo quieres entrar:
        </p>
      </section>

      <nav className={s.modos} aria-label="Modos de la aplicación">
        {MODOS.map((m) => (
          <Link key={m.a} to={m.a} className={s.modo}>
            <span className={s.modoIcono}>{m.icono}</span>
            <span className={s.modoTitulo}>{m.titulo}</span>
            <span className={s.modoTexto}>{m.texto}</span>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="titulo-propuesta">
        <h2 id="titulo-propuesta">Propuesta de valor</h2>
        <div className={s.atributos}>
          {ATRIBUTOS.map((a) => (
            <article key={a.titulo} className={`tarjeta ${s.atributo}`}>
              <h3>{a.icono} {a.titulo}</h3>
              <p className="texto-suave">{a.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <p className={`${s.resumen} texto-suave`} role="status">
        {demo
          ? `Datos de la demo: ${demo.citas.length} citas, ${demo.naves.length} naves y ${demo.patio.bloques.length} bloques de patio (10 a 90). Todo queda guardado solo en este dispositivo.`
          : 'Cargando datos de la demo…'}
      </p>
    </div>
  );
}
