// Indicadores del turno (Modo D): M1 a M8 con valor actual, meta, línea base y semáforo.
// Se actualizan en vivo con lo que pasa en la demo.

import { Semaforo } from '../../components/Semaforo';
import { TEXTO_NIVEL, calcularIndicadores, type NivelIndicador } from '../../data/indicadores';
import { useDemo } from '../../data/store';
import s from './Indicadores.module.css';

export function Indicadores() {
  const demo = useDemo();
  if (!demo) return <p className="contenido">Cargando datos de la demo…</p>;

  const indicadores = calcularIndicadores(demo);
  const cuenta = (n: NivelIndicador) => indicadores.filter((i) => i.nivel === n).length;

  return (
    <div className="contenido">
      <h1>Indicadores del turno</h1>
      <div className={`tarjeta ${s.desafio}`}>
        <p>
          <strong>Desafío:</strong> reducir al menos 10% las esperas (hoy ~42 min de atención), minimizar los
          remanejos y mejorar 15% la eficiencia del patio.
        </p>
      </div>

      <div className={s.resumen} role="status" aria-live="polite">
        <Semaforo nivel="verde">{cuenta('verde')} cumplen la meta</Semaforo>
        <Semaforo nivel="amarillo">{cuenta('amarillo')} cerca de la meta</Semaforo>
        <Semaforo nivel="rojo">{cuenta('rojo')} lejos de la meta</Semaforo>
      </div>

      <div className={s.tarjetas}>
        {indicadores.map((i) => (
          <article key={i.codigo} className={`tarjeta ${s.tarjeta} ${s[i.nivel]}`} aria-labelledby={`ind-${i.codigo}`}>
            <div className={s.cabecera}>
              <span className={s.codigo}>{i.codigo}</span>
              <h2 id={`ind-${i.codigo}`} className={s.nombre}>
                {i.nombre}
              </h2>
            </div>
            <p className={s.valor}>{i.valor}</p>
            <p className={s.dato}>{i.comparacion}</p>
            <p className={s.dato}>
              <strong>Meta:</strong> {i.meta}
            </p>
            <Semaforo nivel={i.nivel}>{TEXTO_NIVEL[i.nivel]}</Semaforo>
            <span className={`${s.fuente} ${i.fuente === 'simulado' ? s.fuenteSimulada : ''}`}>
              {i.fuente === 'demo' ? 'Calculado con los datos de la demo' : 'Estimación simulada'}
            </span>
            <p className={s.dato}>{i.detalle}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
