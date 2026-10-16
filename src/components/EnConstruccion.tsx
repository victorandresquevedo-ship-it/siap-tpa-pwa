import { Link } from 'react-router-dom';
import { IconoVolver } from './Iconos';

/** Pantalla provisoria para los modos que se construyen en fases siguientes. */
export function EnConstruccion({ titulo, fase, items }: { titulo: string; fase: number; items: string[] }) {
  return (
    <div className="contenido contenido--angosto">
      <div className="tarjeta pila">
        <h1>{titulo}</h1>
        <p className="texto-suave">Este modo se construye en la Fase {fase}. Incluirá:</p>
        <ul>
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <Link to="/" className="btn btn--secundario btn--grande">
          <IconoVolver /> Volver al inicio
        </Link>
      </div>
    </div>
  );
}
