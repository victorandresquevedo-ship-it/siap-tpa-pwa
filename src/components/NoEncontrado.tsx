import { Link } from 'react-router-dom';

export function NoEncontrado() {
  return (
    <div className="contenido contenido--angosto">
      <div className="tarjeta pila">
        <h1>No encontramos esa página</h1>
        <p className="texto-suave">Puede que el enlace esté incompleto.</p>
        <Link to="/" className="btn btn--primario btn--grande">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
