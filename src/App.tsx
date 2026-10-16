import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { NoEncontrado } from './components/NoEncontrado';
import { Conductor } from './features/conductor/Conductor';
import { GuiaEjemplo } from './features/conductor/GuiaEjemplo';
import { Indicadores } from './features/indicadores/Indicadores';
import { Inicio } from './features/inicio/Inicio';
import { Planificador } from './features/planificador/Planificador';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="conductor/*" element={<Conductor />} />
          <Route path="guia-ejemplo" element={<GuiaEjemplo />} />
          <Route path="planificador" element={<Planificador />} />
          <Route path="indicadores" element={<Indicadores />} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
