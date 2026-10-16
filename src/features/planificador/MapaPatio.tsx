// Mapa del patio: bloques 10 a 90 con ocupación por color (y texto) y el detalle del bloque
// elegido (bahías × filas, con la altura de cada pila). En modo "Modificar" se puede tocar una pila.

import { Semaforo, type NivelSemaforo } from '../../components/Semaforo';
import type { ResultadoAsignacion } from '../../engine/assign';
import {
  BAHIAS,
  FILAS,
  NIVELES,
  UMBRAL_OCUPACION,
  ocupacionBloque,
  parseBaroti,
  type Bloque,
  type Patio,
  type Pila,
} from '../../engine/yard';
import type { Contenedor } from '../../data/types';
import s from './Planificador.module.css';

interface Props {
  patio: Patio;
  resultado: ResultadoAsignacion | null;
  /** Posición actual de la cita elegida, si ya tiene. */
  actual?: string;
  contenedor?: Contenedor;
  bloqueVisto: number;
  onVerBloque: (id: number) => void;
  /** Modo "Modificar": las pilas compatibles se pueden tocar. */
  eligiendo: boolean;
  onElegirPila: (bloque: number, bahia: number, fila: number) => void;
}

function estadoBloque(b: Bloque): { nivel: NivelSemaforo; texto: string; clase: string } {
  if (b.mantencion) return { nivel: 'neutro', texto: 'En mantención', clase: s.bloqueMantencion };
  const o = ocupacionBloque(b);
  if (o > UMBRAL_OCUPACION) return { nivel: 'rojo', texto: 'Sobre 90%: no recibe', clase: s.bloqueRojo };
  if (o >= 0.7) return { nivel: 'amarillo', texto: 'Casi lleno', clase: s.bloqueAmarillo };
  return { nivel: 'verde', texto: 'Disponible', clase: s.bloqueVerde };
}

function pilaCompatible(b: Bloque, p: Pila, c?: Contenedor): boolean {
  if (!c || b.mantencion || ocupacionBloque(b) > UMBRAL_OCUPACION || p.carga.length >= NIVELES) return false;
  return p.carga.every((x) => (x.naveId === c.naveId && x.puerto === c.puerto) || x.contenedorId === c.id);
}

export function MapaPatio({ patio, resultado, actual, contenedor, bloqueVisto, onVerBloque, eligiendo, onElegirPila }: Props) {
  const marcas = new Map<string, string>(); // "bloque-bahia-fila" → etiqueta
  const marcasBloque = new Map<number, string[]>();
  const marcar = (codigo: string | undefined, etiqueta: string) => {
    const c = codigo && parseBaroti(codigo);
    if (!c) return;
    marcas.set(`${c.bloque}-${c.bahia}-${c.fila}`, etiqueta);
    marcasBloque.set(c.bloque, [...(marcasBloque.get(c.bloque) ?? []), etiqueta]);
  };
  marcar(resultado?.mejor?.codigo, '★');
  resultado?.alternativas.forEach((a, i) => marcar(a.codigo, `A${i + 1}`));
  marcar(actual, 'Actual');

  const bloque = patio.bloques.find((b) => b.id === bloqueVisto)!;
  const etiquetaMarca = (m: string) => (m === '★' ? '★ Sugerida' : m === 'Actual' ? 'Actual' : `Alt. ${m.slice(1)}`);

  return (
    <section className="tarjeta pila" aria-labelledby="titulo-mapa">
      <div className={s.mapaCabecera}>
        <h2 id="titulo-mapa">Mapa del patio</h2>
        <p className={s.leyenda}>Toca un bloque para ver sus bahías y filas.</p>
      </div>

      <div className={s.muelle} aria-hidden="true">
        FRENTE DE ATRAQUE (MUELLE)
      </div>
      <div className={s.bloques} role="group" aria-label="Bloques del patio">
        {patio.bloques.map((b) => {
          const e = estadoBloque(b);
          const ocup = Math.round(ocupacionBloque(b) * 100);
          const m = marcasBloque.get(b.id) ?? [];
          return (
            <button
              key={b.id}
              type="button"
              className={`${s.bloque} ${e.clase}`}
              aria-pressed={b.id === bloqueVisto}
              aria-label={`Bloque ${b.id}, ${ocup}% de ocupación, ${e.texto}, a ${b.distanciaM} metros del frente de atraque${
                m.length ? `, ${m.map(etiquetaMarca).join(', ')}` : ''
              }`}
              onClick={() => onVerBloque(b.id)}
            >
              {m.length > 0 && (
                <span className={s.marcas} aria-hidden="true">
                  {m.map((x) => (
                    <span key={x} className={`${s.marca} ${x === '★' ? s.marcaSugerida : ''}`}>
                      {etiquetaMarca(x)}
                    </span>
                  ))}
                </span>
              )}
              <span className={s.bloqueTitulo}>
                <span>Bloque {b.id}</span>
              </span>
              <span className={s.bloqueOcupacion}>{ocup}%</span>
              <span className={s.medidor} aria-hidden="true">
                <span style={{ width: `${ocup}%` }} />
              </span>
              <Semaforo nivel={e.nivel}>{e.texto}</Semaforo>
              <span className={s.distancia}>{b.distanciaM} m del muelle</span>
            </button>
          );
        })}
      </div>

      <div className="pila" style={{ gap: 8 }}>
        <h3 style={{ margin: 0 }}>
          Bloque {bloque.id}: bahías y filas{' '}
          {eligiendo && <span className="texto-suave">· toca una pila con borde azul para elegirla</span>}
        </h3>
        <div className={s.detalle}>
          <div className={s.grilla} role="group" aria-label={`Pilas del bloque ${bloque.id}`}>
            <span className={s.encabezado} aria-hidden="true" />
            {Array.from({ length: BAHIAS }, (_, i) => (
              <span key={i} className={s.encabezado} aria-hidden="true">
                {i + 1}
              </span>
            ))}
            {Array.from({ length: FILAS }, (_, f) => {
              const fila = f + 1;
              return [
                <span key={`f${fila}`} className={s.encabezado} aria-hidden="true">
                  F{fila}
                </span>,
                ...Array.from({ length: BAHIAS }, (_, i) => {
                  const bahia = i + 1;
                  const p = bloque.pilas[(bahia - 1) * FILAS + (fila - 1)];
                  const altura = p.carga.length;
                  const marca = marcas.get(`${bloque.id}-${bahia}-${fila}`);
                  const misma =
                    !!contenedor && altura > 0 && p.carga.every((x) => x.naveId === contenedor.naveId && x.puerto === contenedor.puerto);
                  const elegible = eligiendo && pilaCompatible(bloque, p, contenedor);
                  return (
                    <button
                      key={`${bahia}-${fila}`}
                      type="button"
                      className={`${s.celda} ${s[`altura${altura}`]} ${misma || elegible ? s.celdaMisma : ''} ${marca ? s.celdaMarcada : ''}`}
                      disabled={!elegible}
                      aria-label={`Bahía ${bahia}, fila ${fila}: ${altura} de ${NIVELES} niveles${
                        misma ? ', misma nave y destino' : ''
                      }${marca ? `, ${etiquetaMarca(marca)}` : ''}`}
                      onClick={() => onElegirPila(bloque.id, bahia, fila)}
                    >
                      {marca === 'Actual' ? '●' : (marca ?? (altura || ''))}
                    </button>
                  );
                }),
              ];
            })}
          </div>
        </div>
        <div className={s.leyendaMapa}>
          <span>Altura de la pila:</span>
          {[0, 1, 2, 3, 4, 5].map((h) => (
            <span key={h}>
              <span className={`${s.muestra} ${s[`altura${h}`]}`} />
              {h}
            </span>
          ))}
          <span>
            <span className={s.muestra} style={{ boxShadow: 'inset 0 0 0 2px var(--petroleo)' }} />
            Misma nave y destino
          </span>
          <span>★ sugerida · A1/A2 alternativas · ● posición actual</span>
        </div>
      </div>
    </section>
  );
}
