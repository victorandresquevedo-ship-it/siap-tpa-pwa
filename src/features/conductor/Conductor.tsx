// Modo conductor: consentimiento → conductor de ejemplo → reserva o cita.

import { Navigate, Route, Routes } from 'react-router-dom';
import { useDemo } from '../../data/store';
import { Consentimiento } from './Consentimiento';
import { ElegirConductor } from './ElegirConductor';
import { MiCita } from './MiCita';
import { Reprogramar } from './Reprogramar';
import { Reserva } from './Reserva';

export function Conductor() {
  const demo = useDemo();
  if (!demo) return <p className="contenido">Cargando…</p>;

  const { dispositivo } = demo;
  if (!dispositivo.consentimientoEn) return <Consentimiento />;
  if (!dispositivo.conductorId) return <ElegirConductor demo={demo} />;

  return (
    <Routes>
      <Route index element={<Navigate to={dispositivo.citaId ? 'cita' : 'reservar'} replace />} />
      <Route path="reservar" element={<Reserva demo={demo} />} />
      <Route path="cita" element={<MiCita demo={demo} />} />
      <Route path="reprogramar" element={<Reprogramar demo={demo} />} />
      <Route path="quien" element={<ElegirConductor demo={demo} />} />
      <Route path="*" element={<Navigate to="/conductor" replace />} />
    </Routes>
  );
}
