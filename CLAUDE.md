# CLAUDE.md · Contexto para retomar el proyecto

## Qué es
PWA "SIAP-TPA": prototipo de demostración (sin backend, datos simulados) para el proyecto de
Innovación y Emprendimiento III de INACAP Arica. Problema: en el patio de Terminal Puerto Arica
la atención de camiones tarda ~42 min (meta 15), congestión 12:00–17:00, asignación de posiciones
a mano, ~75% de la carga es boliviana y en el antepuerto la señal es irregular.

La especificación completa (prompt maestro) está en
`C:\Users\lavez\Downloads\PWA_SIAP-TPA_Prompt_e_Instrucciones.md`.

## Forma de trabajo
- 5 fases; **detenerse al final de cada una** y decir: qué quedó, cómo probar, qué falta.
- El usuario hace commit al aprobar cada fase ("Fase aprobada, sigue con la siguiente").
- Toda la interfaz en **español de Chile**, y siempre visible "Prototipo de demostración, datos simulados".

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Base, tema, rutas, datos de ejemplo, motor + pruebas | Hecha |
| 2 | Modo B: consentimiento, reserva 2 pasos, QR guía, franja recomendada, SMS simulado, reprogramar (+ QR de ingreso, "Borrar mis datos" y selector de conductor de ejemplo, adelantados) | Hecha |
| 3 | Modo C: modo cabina, tiempo con motivo, aviso de cambio, banner sin señal, encuesta; QR "dos dispositivos"; Panel de la demo (`/demo`) | Hecha |
| 4 | Modo A: consola, mapa por bloques, panel "por qué", alternativas, aceptar/modificar con motivo en 1 toque; Modo D: M1–M8 | Hecha |
| 5 | vite-plugin-pwa (precache, manifest, íconos 192/512), cola "pendiente de enviar", accesibilidad, README, Vercel | Hecha |

Las 5 fases están hechas. Lo que siga son ajustes que pida el usuario (los "prompts cortos" de la
especificación: ajuste visual a 360 px, guía de pruebas offline, datos para la historia de la demo,
despliegue, revisión final contra los criterios de aceptación).

## Stack
Vite 8 + React 19 + TypeScript 7 (tsc nativo) + React Router 7 (BrowserRouter), CSS global con
variables + CSS Modules, idb-keyval, qrcode (generar), jsqr (leer cuando no hay BarcodeDetector,
p. ej. Chrome de Windows), vite-plugin-pwa 2 (Fase 5), Vitest 5.

## Decisiones
- **Motor** (`src/engine/assign.ts`): función pura; `ahora` entra como parámetro (nunca `Date.now()`
  adentro). Pesos: nave 30, puerto 20, peso 15, embarque 20, distancia 15 (suma 100). Una pila solo
  recibe misma nave + mismo puerto. Excluye mantención y ocupación > 90%. Desempate por bloque,
  bahía, fila. Alternativas en bloques distintos (si no hay, bahías distintas). Al recalcular
  ignora la posición actual del mismo contenedor. `puntuarPosicion` sirve para "Modificar".
- **Patio**: bloques 10–90 × 20 bahías × 6 filas × 5 niveles. Coordenada Baroti `40-12-03-2`.
- **Datos** (`src/data/seed.ts`): deterministas para un mismo día (PRNG con semilla fija solo para
  poblar el patio). Naves, navieras, conductores, patentes y teléfonos son ficticios. Siglas ISO 6346
  con dígito de control válido. La guía de ejemplo boliviana (`EJEMPLOS.boliviano`, Andes Express →
  Shanghái) cae en el bloque 40: es la historia de la demo (hay una prueba que lo asegura).
- **Esquema versionado**: si cambia la forma de `DemoState`, subir `VERSION_ESQUEMA` en `seed.ts`
  (los datos guardados se regeneran). También se regeneran si cambia el día.
- **Capa de datos**: las pantallas solo usan `src/data/store.ts` (interfaz `DataStore` + hook
  `useDemo`). La implementación local (`localStore.ts`) guarda en IndexedDB y avisa a otras pestañas
  por BroadcastChannel (el último en escribir gana). Las operaciones de dominio (reservar,
  reprogramar, decidir posición...) se agregan a la interfaz en las fases 2–4.
- **Acciones** (`src/data/acciones.ts`): operaciones puras `(estado, ...) => { estado, resultado }`
  (patrón `Cambio<T>`); `localStore.modificar` las aplica y guarda. Errores para el usuario con
  `ErrorDemo` (mensaje listo para mostrar). Probadas en `acciones.test.ts`.
- **Franjas** (`src/data/franjas.ts`): 1 h de 08:00 a 20:00, capacidad 10 por franja, demanda simulada
  por día desde `diaBase` + citas de la demo. Espera estimada `8 + 34·r²` (42 min con la franja llena).
  Semáforo: ≥4 libres verde, 1–3 amarillo, 0 rojo. Recomendada: menor espera evitando 12–17 h si se puede;
  al reprogramar el mismo día prefiere franjas posteriores a la actual (el conductor se atrasó) y nunca
  la actual. La recepción de cada nave cierra 6 h antes del embarque (`cierreRecepcion`).
- **Historia de la demo**: Andes Express embarca pasado mañana 08:00 (cierre 02:00), así el conductor
  boliviano reserva mañana; la recomendada de mañana es 10:00 (pruebas lo aseguran).
- **Dispositivo** (`DemoState.dispositivo`): consentimiento, conductor de ejemplo y cita activa del
  teléfono. "Borrar mis datos" limpia solo esto (la terminal conserva la cita). Al elegir conductor se
  recupera su cita activa.
- **QR** (`src/data/qr.ts`): guía `SIAPTPA:GUIA:<guia>:<contenedor>` (también acepta sigla o n° de guía a
  mano); ingreso `SIAPTPA:INGRESO:<cita>:<contenedor>:<patente>:<fecha>:<hora>`. `LectorQr` usa
  BarcodeDetector o jsQR (carga diferida) y ofrece "Tomar foto de la guía" porque la cámara en vivo
  exige https. `CodigoQr` dibuja SVG local con `qrcode`.
- **Seguimiento** (`src/data/seguimiento.ts`, `MiCita.tsx`): `Cita.tiempoEstimado` es un historial
  `{minutos, delta, motivo}`; el tiempo **solo cambia con motivo** (reservar, reprogramar, nave adelanta
  embarque +6 min, cambio de bloque ±1 min cada 60 m). Lugar en la fila = camiones simulados de la
  franja + citas por `enFilaDesde`. `Cita.avisos` = avisos destacados (posición asignada/cambiada) con
  "Entendido". Modo cabina: preferencia por equipo en `localStorage` (`siap-tpa:modo-cabina`).
- **Hitos** (`registrarHito`): solo avanzan; garita/atendido exigen posición asignada. Atendido guarda
  minutos (por defecto el tiempo vigente) y si fue dentro de la franja; luego encuesta de 5 caras.
- **Planificador** (`decidirPosicion`, ya disponible para la Fase 4): valida mantención, pila llena y
  pila de otra nave/destino; recalcula el nivel real; deja el contenedor en el patio una sola vez;
  `decision` = aceptada si coincide con la sugerida, si no modificada con motivo (`TEXTO_MOTIVO`).
- **Dos dispositivos** (`src/data/paquete.ts`): `/importar#d=<base64url JSON>` con la cita (historial
  recortado) y el embarque de su nave. `importarCita(..., {comoConductor})`: en el celular la deja como
  cita del teléfono; en la consola (`comoConductor: false`) solo la actualiza. Rechaza otro día y un
  número de cita usado por otro contenedor. `Importar.tsx` borra el `#` de la URL al leerlo.
- **Panel de la demo** (`src/features/demo/PanelDemo.tsx`): simula terminal (aceptar/cambiar posición,
  hitos, nave adelanta 12 h) y QR en ambos sentidos. La consola completa de la Fase 4 debe reutilizar
  `decidirPosicion` y `puntuarPosicion`.
- **Consola** (`src/features/planificador/`): `Planificador.tsx` tiene el estado (cita elegida, filtro,
  modo Modificar, alternativa elegida, bloque visto); `ColaIngresos`, `PanelSugerencia` y `MapaPatio`
  son de presentación. Modificar = elegir alternativa o pila compatible del mapa (`puntuarPosicion`) →
  motivo en un toque → `decidirPosicion`. Si se elige la pila sugerida, cuenta como aceptada.
  "Leer QR del celular" importa con `comoConductor: false`. Tras decidir, muestra el QR para el celular.
- **Indicadores** (`src/data/indicadores.ts`): M1 (promedio atendidos), M4 (aceptadas/decididas), M5
  (agendados hoy / + 45 sin cita simulados), M6 (dentro de franja), M7 (agendados hoy en 12–17) se
  calculan con la demo; M2, M3 y M8 son estimaciones marcadas "simulado". Semáforo por avance desde la
  línea base (`LINEA_BASE`) hacia la meta: ≥1 verde, ≥0,5 amarillo, si no rojo. La consola muestra M1,
  M4 y M6.
- **PWA** (`vite.config.ts`): `VitePWA` con `generateSW`, `registerType: 'autoUpdate'`,
  `injectRegister: false` (registro en `src/pwa/registrarSW.ts`, que avisa "lista sin señal" con
  `onOfflineReady`), precache de `**/*.{js,css,html,svg,png,webmanifest}` y `navigateFallback:
  'index.html'`. Solo activo en build/preview (no en dev). Manifest en es-CL, theme #21295C, íconos 192,
  512 y maskable 512 en `public/icons/` (`npm run iconos`, script sin dependencias que dibuja y escribe
  PNG con zlib) + apple-touch-icon 180.
- **Cola "pendiente de enviar"** (`DemoState.pendientes`, `encolarPendiente`/`enviarPendientes` en
  acciones): `localStore.delConductor` encola reservar, reprogramar y encuesta si `navigator.onLine` es
  false. `src/pwa/cola.ts` envía (simulado, 1,5 s) al volver la señal y al iniciar. MiCita muestra
  "Pendiente de enviar"; el banner cuenta los pendientes y anuncia "✓ N cambios enviados".
- **Accesibilidad**: enlace "Saltar al contenido", `document.title` por pantalla, `ErrorPantalla`
  (error boundary por ruta), `prefers-reduced-motion`, contraste AA revisado (la altura 4 del mapa usa
  texto azul marino). Un solo `h1` por pantalla.
- **Vercel** (`vercel.json`): framework vite, `npm run build` → `dist`, rewrite de todo a
  `/index.html`, `sw.js` sin caché.
- **Banner de conexión** (`components/BannerConexion.tsx`, en Layout): "Sin señal: usando datos
  guardados (al HH:MM)" con `DemoState.actualizadoEn`; "Conexión recuperada" 4 s.
- **Momento de cálculo** en pantalla: `momentoCalculo()` redondea a 15 min para que la sugerencia no
  cambie de un segundo a otro.
- **Sin servicios externos**: tipografías del sistema (Cambria/Georgia; Inter/Calibri/Segoe UI), sin
  Google Fonts ni analítica (Ley 21.719: todo queda en el dispositivo; sin geolocalización continua).

## Diseño
Azul marino `#21295C`, petróleo `#065A82` / `#1C7293`, acento naranja `#E8963D` (no usar como color
de texto: no cumple AA), fondo `#F4F7FA`, tarjetas blancas con borde `#D9E3E8`. Semáforo siempre con
ícono + texto (`components/Semaforo.tsx`). Botones del modo conductor ≥ 56 px (`.btn--grande` = 60 px).

## Notas del equipo (Windows)
- Node está en `C:\Program Files\nodejs`; en shells nuevos puede faltar en el PATH.
- npm de este equipo bloquea scripts de instalación (no usar dependencias que los necesiten, p. ej. `sharp`).
- El watcher de Vite a veces no detecta dos ediciones muy seguidas: si la página queda en blanco con
  un error viejo, guardar el archivo de nuevo (o `touch`) y recargar.
- Configuración de vista previa para Claude Code: `.claude/launch.json` (`siap-dev` 5173 y
  `siap-preview` 4173). Si la sesión partió en otra carpeta, el panel de vista previa lee el
  `launch.json` de esa carpeta: en `C:\Users\lavez\electricista-arica\.claude\launch.json` existen
  `siap-dev` (5180) y `siap-preview` (5181).
- Prueba offline real hecha: build + preview, reservar, detener el servidor y recargar → la app abre
  desde el service worker (todas las rutas).
- `optimizeDeps.include` en `vite.config.ts` evita que Vite recargue la página la primera vez que se
  usa una dependencia (agregar ahí las nuevas dependencias de la app).
