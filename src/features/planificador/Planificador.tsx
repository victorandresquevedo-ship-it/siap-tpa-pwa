// Consola del planificador (Modo A): cola de ingresos, posición sugerida con su porqué,
// alternativas, Aceptar / Modificar con motivo en un toque, mapa del patio e indicadores del turno.
// Al decidir, el conductor recibe el aviso (misma app en otra pestaña, o por QR en otro equipo).

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Semaforo } from '../../components/Semaforo';
import { asignar, puntuarPosicion, type EntradaAsignacion, type Sugerencia } from '../../engine/assign';
import { parseBaroti } from '../../engine/yard';
import { momentoCalculo } from '../../data/fechas';
import { TEXTO_NIVEL, calcularIndicadores } from '../../data/indicadores';
import { extraerPaquete } from '../../data/paquete';
import { contenedorAsignable } from '../../data/seed';
import { store, useDemo } from '../../data/store';
import { TEXTO_MOTIVO, type MotivoCambio } from '../../data/types';
import { ColaIngresos, type Filtro } from './ColaIngresos';
import { MapaPatio } from './MapaPatio';
import { PanelSugerencia, type Mensaje } from './PanelSugerencia';
import s from './Planificador.module.css';

const KPIS_CONSOLA = ['M1', 'M4', 'M6'];

export function Planificador() {
  const demo = useDemo();
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [citaId, setCitaId] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const [elegida, setElegida] = useState<Sugerencia | null>(null);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [decidida, setDecidida] = useState(false);
  const [bloqueVisto, setBloqueVisto] = useState<number | null>(null);
  const ahora = momentoCalculo();

  const listas = useMemo(() => {
    const activas = (demo?.citas ?? [])
      .filter((c) => c.estado !== 'atendido')
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.franja - b.franja || a.id.localeCompare(b.id));
    return {
      pendientes: activas.filter((c) => !c.posicion),
      con_posicion: activas.filter((c) => c.posicion),
      todas: activas,
    };
  }, [demo]);

  const cita = listas.todas.find((c) => c.id === citaId) ?? listas[filtro][0];

  const entrada = useMemo<EntradaAsignacion | null>(() => {
    if (!demo || !cita) return null;
    const contenedor = demo.contenedores.find((c) => c.id === cita.contenedorId)!;
    return { contenedor: contenedorAsignable(demo, contenedor), patio: demo.patio, ahora };
  }, [demo, cita, ahora]);
  const resultado = useMemo(() => (entrada ? asignar(entrada) : null), [entrada]);

  const kpis = useMemo(
    () => (demo ? calcularIndicadores(demo).filter((i) => KPIS_CONSOLA.includes(i.codigo)) : []),
    [demo],
  );

  if (!demo) return <p className="contenido">Cargando datos de la demo…</p>;

  function seleccionar(id: string) {
    setCitaId(id);
    setEligiendo(false);
    setElegida(null);
    setMensaje(null);
    setDecidida(false);
    setBloqueVisto(null);
  }

  async function decidir(sugerencia: Sugerencia, motivo?: MotivoCambio) {
    if (!cita || !resultado?.mejor) return;
    try {
      const nueva = await store.decidirPosicion(cita.id, {
        codigo: sugerencia.codigo,
        sugerida: resultado.mejor.codigo,
        puntaje: sugerencia.puntaje,
        motivo,
      });
      const p = nueva.posicion!;
      setCitaId(cita.id);
      setMensaje({
        tipo: 'ok',
        texto:
          p.decision === 'aceptada'
            ? `Posición ${p.codigo} aceptada. El conductor ya ve el aviso.`
            : `Posición ${p.codigo} asignada (motivo: ${TEXTO_MOTIVO[p.motivo ?? 'otro']}). El conductor ya ve el aviso.`,
      });
      setDecidida(true);
      setEligiendo(false);
      setElegida(null);
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo asignar.' });
    }
  }

  function elegirPila(bloque: number, bahia: number, fila: number) {
    if (!entrada || !resultado?.mejor) return;
    const sugerencia = puntuarPosicion(entrada, bloque, bahia, fila);
    if (!sugerencia) {
      setMensaje({ tipo: 'error', texto: 'Esa pila no puede recibir este contenedor.' });
    } else if (sugerencia.codigo === resultado.mejor.codigo) {
      void decidir(resultado.mejor);
    } else {
      setMensaje(null);
      setElegida(sugerencia);
    }
  }

  async function importar(texto: string) {
    try {
      const nueva = await store.importarCita(extraerPaquete(texto), { comoConductor: false });
      seleccionar(nueva.id);
      setFiltro(nueva.posicion ? 'con_posicion' : 'pendientes');
      setMensaje({ tipo: 'ok', texto: `Cita ${nueva.id} cargada desde el celular.` });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo leer el código.' });
    }
  }

  const bloqueMapa =
    bloqueVisto ??
    elegida?.coordenada.bloque ??
    resultado?.mejor?.coordenada.bloque ??
    (cita?.posicion && parseBaroti(cita.posicion.codigo)?.bloque) ??
    40;
  const contenedor = cita && demo.contenedores.find((c) => c.id === cita.contenedorId);

  return (
    <div className="contenido">
      <div className={s.cabecera}>
        <h1>Consola del planificador</h1>
        <div className={s.kpis}>
          {kpis.map((k) => (
            <Link key={k.codigo} to="/indicadores" className={s.kpi} aria-label={`${k.codigo} ${k.nombre}: ${k.valor}, meta ${k.meta}, ${TEXTO_NIVEL[k.nivel]}`}>
              <span className={s.kpiNombre}>
                {k.codigo} · {k.nombre}
              </span>
              <span className={s.kpiValor}>{k.valor}</span>
              <span className={s.kpiMeta}>Meta: {k.meta}</span>
              <Semaforo nivel={k.nivel}>{TEXTO_NIVEL[k.nivel]}</Semaforo>
            </Link>
          ))}
        </div>
      </div>

      <div className={s.rejilla}>
        <ColaIngresos
          demo={demo}
          citas={listas}
          filtro={filtro}
          onFiltro={(f) => {
            setFiltro(f);
            setCitaId(null);
            setMensaje(null);
            setDecidida(false);
            setEligiendo(false);
            setElegida(null);
            setBloqueVisto(null);
          }}
          seleccionadaId={cita?.id}
          onSeleccionar={seleccionar}
          onQrLeido={importar}
        />
        {cita && resultado ? (
          <PanelSugerencia
            demo={demo}
            cita={cita}
            resultado={resultado}
            ahora={ahora}
            eligiendo={eligiendo}
            elegida={elegida}
            mensaje={mensaje}
            decidida={decidida}
            hayPendientes={listas.pendientes.some((c) => c.id !== cita.id)}
            onAceptar={() => resultado.mejor && decidir(resultado.mejor)}
            onModificar={() => {
              setEligiendo(true);
              setMensaje(null);
            }}
            onElegir={(a) => {
              setEligiendo(true);
              setElegida(a);
              setBloqueVisto(a.coordenada.bloque);
              setMensaje(null);
            }}
            onMotivo={(m) => elegida && decidir(elegida, m)}
            onCancelar={() => {
              setEligiendo(false);
              setElegida(null);
            }}
            onSiguiente={() => {
              const siguiente = listas.pendientes.find((c) => c.id !== cita.id);
              if (siguiente) {
                setFiltro('pendientes');
                seleccionar(siguiente.id);
              }
            }}
          />
        ) : (
          <section className="tarjeta">
            <p>No hay citas en esta lista. Las nuevas reservas aparecen aquí al instante.</p>
            {mensaje && <p className={mensaje.tipo === 'error' ? 'aviso-error' : 'aviso-ok'}>{mensaje.texto}</p>}
          </section>
        )}
      </div>

      <MapaPatio
        patio={demo.patio}
        resultado={resultado}
        actual={cita?.posicion?.codigo}
        contenedor={contenedor}
        bloqueVisto={bloqueMapa}
        onVerBloque={setBloqueVisto}
        eligiendo={eligiendo && !elegida}
        onElegirPila={elegirPila}
      />
    </div>
  );
}
