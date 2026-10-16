// Implementación local de DataStore: guarda en IndexedDB (idb-keyval) y avisa a las otras
// pestañas con BroadcastChannel. Así la consola y el "celular" pueden ser dos ventanas del
// mismo notebook. Nada sale del dispositivo.

import { createStore, get, set, type UseStore } from 'idb-keyval';
import * as acciones from './acciones';
import { fechaISO } from './fechas';
import { VERSION_ESQUEMA, crearEstadoDemo } from './seed';
import type { DataStore, Escucha } from './store';
import type { DemoState } from './types';

const CLAVE = 'estado';
const CANAL = 'siap-tpa';

interface MensajeCanal {
  tipo: 'cambio';
  revision: number;
}

function abrirIdb(): UseStore | null {
  try {
    return typeof indexedDB === 'undefined' ? null : createStore('siap-tpa', 'datos');
  } catch {
    return null; // Navegación privada u otro bloqueo: la demo sigue en memoria.
  }
}

export function crearStoreLocal(): DataStore & { guardar(nuevo: DemoState): Promise<void> } {
  let actual: DemoState | null = null;
  let carga: Promise<DemoState> | null = null;
  const escuchas = new Set<Escucha>();
  const idb = abrirIdb();
  const canal = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CANAL);

  const avisar = () => escuchas.forEach((e) => e());

  async function leer(): Promise<DemoState | undefined> {
    if (!idb) return undefined;
    try {
      return await get<DemoState>(CLAVE, idb);
    } catch {
      return undefined;
    }
  }

  async function escribir(estado: DemoState): Promise<void> {
    if (!idb) return;
    try {
      await set(CLAVE, estado, idb);
    } catch (error) {
      console.warn('No se pudo guardar en el dispositivo; la demo sigue en memoria.', error);
    }
  }

  /** Guarda un estado nuevo, avisa a esta pestaña y a las demás. */
  async function guardar(nuevo: DemoState): Promise<void> {
    const siguiente = { ...nuevo, revision: Math.max(nuevo.revision, actual?.revision ?? 0) + 1 };
    actual = siguiente;
    avisar();
    await escribir(siguiente);
    canal?.postMessage({ tipo: 'cambio', revision: siguiente.revision } satisfies MensajeCanal);
  }

  /** Aplica una operación pura (ver acciones.ts) sobre el estado actual y la guarda. */
  async function modificar<T>(operacion: (estado: DemoState) => acciones.Cambio<T>): Promise<T> {
    const { estado, resultado } = operacion(actual ?? (await api.iniciar()));
    await guardar(estado);
    return resultado;
  }

  // Otra pestaña guardó: se adopta lo que quedó en IndexedDB (el último en escribir gana).
  canal?.addEventListener('message', async (ev: MessageEvent<MensajeCanal>) => {
    if (ev.data?.tipo !== 'cambio') return;
    const guardado = await leer();
    if (guardado && guardado.revision !== actual?.revision) {
      actual = guardado;
      avisar();
    }
  });

  const api: DataStore & { guardar(nuevo: DemoState): Promise<void> } = {
    iniciar() {
      carga ??= (async () => {
        const guardado = await leer();
        // Datos de otro día o de otra versión: se regeneran para que la historia de la demo calce con hoy.
        const vigente = guardado && guardado.version === VERSION_ESQUEMA && guardado.diaBase === fechaISO(new Date());
        if (vigente) {
          actual = guardado;
          avisar();
        } else {
          await guardar({ ...crearEstadoDemo(), revision: guardado?.revision ?? 0 });
        }
        return actual!;
      })();
      return carga;
    },
    estado: () => actual,
    suscribir(escucha) {
      escuchas.add(escucha);
      return () => escuchas.delete(escucha);
    },
    async reiniciarDemo() {
      await guardar({ ...crearEstadoDemo(), revision: actual?.revision ?? 0 });
    },
    aceptarConsentimiento: () => modificar((s) => acciones.aceptarConsentimiento(s, new Date())),
    elegirConductor: (conductorId) => modificar((s) => acciones.elegirConductor(s, conductorId)),
    reservarCita: (datos) => modificar((s) => acciones.reservarCita(s, datos, new Date())),
    reprogramarCita: (citaId, fecha, franja) =>
      modificar((s) => acciones.reprogramarCita(s, citaId, fecha, franja, new Date())),
    borrarMisDatos: () => modificar((s) => acciones.borrarMisDatos(s)),
    guardar,
  };
  return api;
}
