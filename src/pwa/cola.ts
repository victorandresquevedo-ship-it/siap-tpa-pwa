// Envío automático de la cola "pendiente de enviar" cuando vuelve la conexión.
// Sin servidor el envío es simulado: tras una breve espera, los cambios quedan marcados como enviados.

import { pendientesSinEnviar } from '../data/acciones';
import { store } from '../data/store';

const ESPERA_ENVIO_MS = 1500;

async function enviarSiCorresponde() {
  const estado = await store.iniciar();
  if (!navigator.onLine || pendientesSinEnviar(store.estado() ?? estado).length === 0) return;
  await new Promise((r) => setTimeout(r, ESPERA_ENVIO_MS));
  if (navigator.onLine) await store.enviarPendientes();
}

export function iniciarEnvioAutomatico(): void {
  window.addEventListener('online', () => void enviarSiCorresponde());
  void enviarSiCorresponde();
}
