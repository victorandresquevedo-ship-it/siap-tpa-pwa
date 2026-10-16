import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { store } from './data/store';
import { iniciarEnvioAutomatico } from './pwa/cola';
import { registrarServiceWorker } from './pwa/registrarSW';
import './styles/global.css';

// Carga (o crea) los datos de la demo lo antes posible.
void store.iniciar();
registrarServiceWorker();
iniciarEnvioAutomatico();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
