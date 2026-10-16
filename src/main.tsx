import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { store } from './data/store';
import './styles/global.css';

// Carga (o crea) los datos de la demo lo antes posible.
void store.iniciar();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
