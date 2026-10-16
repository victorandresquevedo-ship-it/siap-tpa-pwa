import { Component, type ReactNode } from 'react';
import { store } from '../data/store';

/** Si una pantalla falla, muestra un mensaje con salidas en vez de una página en blanco. */
export class ErrorPantalla extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Error en la pantalla:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="contenido contenido--angosto">
        <div className="tarjeta pila" role="alert">
          <h1>Algo salió mal en esta pantalla</h1>
          <p className="texto-suave">Tus datos siguen guardados en este equipo. Prueba volver al inicio.</p>
          <a href="/" className="btn btn--primario btn--grande">
            Volver al inicio
          </a>
          <button
            type="button"
            className="btn btn--secundario btn--grande"
            onClick={async () => {
              await store.reiniciarDemo();
              window.location.assign('/');
            }}
          >
            Reiniciar demo
          </button>
        </div>
      </div>
    );
  }
}
