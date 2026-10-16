import type { ReactNode } from 'react';
import { IconoAlerta, IconoAlto, IconoCheck } from './Iconos';

export type NivelSemaforo = 'verde' | 'amarillo' | 'rojo' | 'neutro';

const ICONO: Record<NivelSemaforo, ReactNode> = {
  verde: <IconoCheck />,
  amarillo: <IconoAlerta />,
  rojo: <IconoAlto />,
  neutro: null,
};

/** Etiqueta de semáforo: nunca depende solo del color (lleva ícono y texto). */
export function Semaforo({ nivel, children }: { nivel: NivelSemaforo; children: ReactNode }) {
  return (
    <span className={`semaforo semaforo--${nivel}`}>
      {ICONO[nivel]}
      {children}
    </span>
  );
}
