// Cola de ingresos con cita: contenedor, nave, destino, peso, franja y estado.

import { useState } from 'react';
import { LectorQr } from '../../components/LectorQr';
import { textoDia, textoFranja } from '../../data/fechas';
import { nombrePuerto } from '../../data/seed';
import { TEXTO_ESTADO } from '../../data/seguimiento';
import type { Cita, DemoState } from '../../data/types';
import s from './Planificador.module.css';

export type Filtro = 'pendientes' | 'con_posicion' | 'todas';

const TEXTO_FILTRO: Record<Filtro, string> = {
  pendientes: 'Pendientes de posición',
  con_posicion: 'Con posición',
  todas: 'Todas',
};

interface Props {
  demo: DemoState;
  citas: Record<Filtro, Cita[]>;
  filtro: Filtro;
  onFiltro: (f: Filtro) => void;
  seleccionadaId?: string;
  onSeleccionar: (id: string) => void;
  onQrLeido: (texto: string) => void;
}

export function ColaIngresos({ demo, citas, filtro, onFiltro, seleccionadaId, onSeleccionar, onQrLeido }: Props) {
  const [leyendo, setLeyendo] = useState(false);
  const lista = citas[filtro];

  return (
    <section className="tarjeta" aria-labelledby="titulo-cola">
      <div className={s.colaCabecera}>
        <h2 id="titulo-cola">Cola de ingresos con cita</h2>
        <button type="button" className="btn btn--secundario" aria-expanded={leyendo} onClick={() => setLeyendo((v) => !v)}>
          {leyendo ? 'Cerrar lector' : 'Leer QR del celular'}
        </button>
      </div>
      {leyendo && (
        <div style={{ marginBottom: 12 }}>
          <LectorQr
            onLeido={(t) => {
              setLeyendo(false);
              onQrLeido(t);
            }}
          />
        </div>
      )}

      <div className={s.filtros} role="group" aria-label="Filtrar la cola">
        {(Object.keys(TEXTO_FILTRO) as Filtro[]).map((f) => (
          <button key={f} type="button" className={s.filtro} aria-pressed={f === filtro} onClick={() => onFiltro(f)}>
            {TEXTO_FILTRO[f]} ({citas[f].length})
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="texto-suave">No hay citas en esta lista.</p>
      ) : (
        <div className={s.desplazable}>
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Contenedor</th>
                <th scope="col">Nave → destino</th>
                <th scope="col">Peso</th>
                <th scope="col">Franja</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((cita) => {
                const cont = demo.contenedores.find((c) => c.id === cita.contenedorId)!;
                const nave = demo.naves.find((n) => n.id === cont.naveId)!;
                const activa = cita.id === seleccionadaId;
                return (
                  <tr
                    key={cita.id}
                    className={`${s.fila} ${activa ? s.filaActiva : ''}`}
                    onClick={() => onSeleccionar(cita.id)}
                  >
                    <td>
                      <button
                        type="button"
                        className={`btn ${activa ? 'btn--primario' : 'btn--secundario'} ${s.botonFila} mono`}
                        aria-pressed={activa}
                        aria-label={`Ver la cita del contenedor ${cont.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeleccionar(cita.id);
                        }}
                      >
                        {cont.id}
                      </button>
                    </td>
                    <td>
                      {nave.nombre}
                      <div className={s.leyenda}>→ {nombrePuerto(cont.puerto)}</div>
                    </td>
                    <td className={s.sinCorte}>{cont.pesoT.toLocaleString('es-CL')} t</td>
                    <td className={s.sinCorte}>
                      {textoFranja(cita.franja)}
                      <div className={s.leyenda}>{textoDia(cita.fecha)}</div>
                    </td>
                    <td className={s.sinCorte}>
                      {TEXTO_ESTADO[cita.estado]}
                      <div className={`${s.leyenda} ${cita.posicion ? 'mono' : ''}`}>
                        {cita.posicion?.codigo ?? 'sin posición'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
