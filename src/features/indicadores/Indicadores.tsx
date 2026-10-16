import { EnConstruccion } from '../../components/EnConstruccion';

export function Indicadores() {
  return (
    <EnConstruccion
      titulo="Indicadores del turno"
      fase={4}
      items={[
        'M1 tiempo de atención, M2 remanejos, M3 eficiencia, M4 sugerencias aceptadas.',
        'M5 camiones con cita, M6 cumplimiento de franja, M7 concentración 12-17 h, M8 consultas al personal.',
        'Cada indicador con valor actual simulado, meta y semáforo (color, ícono y texto).',
      ]}
    />
  );
}
