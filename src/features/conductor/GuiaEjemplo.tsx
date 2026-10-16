// Guías de despacho de ejemplo con su QR, para mostrarlas en el notebook y escanearlas con el celular.

import { CodigoQr } from '../../components/CodigoQr';
import { textoQrGuia } from '../../data/qr';
import { EJEMPLOS, nombrePuerto } from '../../data/seed';
import { useDemo } from '../../data/store';
import s from './Conductor.module.css';

export function GuiaEjemplo() {
  const demo = useDemo();
  if (!demo) return <p className="contenido">Cargando datos de la demo…</p>;

  return (
    <div className="contenido">
      <h1>Guías de despacho de ejemplo</h1>
      <p className="texto-suave">
        En el celular abre <strong>Soy conductor</strong>, toca <strong>Escanear QR de la guía</strong> y apunta a uno
        de estos códigos. Documentos ficticios, solo para la demo.
      </p>
      <div className={s.guias}>
        {(['boliviano', 'nacional'] as const).map((tipo) => {
          const ej = EJEMPLOS[tipo];
          const contenedor = demo.contenedores.find((c) => c.id === ej.contenedorId)!;
          const nave = demo.naves.find((n) => n.id === contenedor.naveId)!;
          const conductor = demo.conductores.find((c) => c.id === ej.conductorId)!;
          return (
            <article key={tipo} className={`tarjeta pila ${s.guia}`} aria-labelledby={`guia-${tipo}`}>
              <h2 id={`guia-${tipo}`} style={{ margin: 0 }}>
                Guía N° {contenedor.guia}
              </h2>
              <dl className={s.resumen}>
                <dt>Contenedor</dt>
                <dd className="mono">{contenedor.id}</dd>
                <dt>Nave</dt>
                <dd>{nave.nombre}</dd>
                <dt>Destino</dt>
                <dd>{nombrePuerto(contenedor.puerto)}</dd>
                <dt>Peso</dt>
                <dd>{contenedor.pesoT.toLocaleString('es-CL')} t</dd>
                <dt>Transportista</dt>
                <dd>
                  {conductor.nombre} ({conductor.patente})
                </dd>
              </dl>
              <CodigoQr texto={textoQrGuia(contenedor)} etiqueta={`Código QR de la guía ${contenedor.guia}`} tamano={240} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
