# SIAP-TPA · Prototipo de demostración

**Sistema Integrado de Asignación y Programación del Patio de Terminal Puerto Arica.**
PWA del proyecto de Innovación y Emprendimiento III (INACAP Arica).

> Prototipo navegable con **datos simulados**. No se conecta al N4/XPS de TPA ni a datos reales,
> y no tiene servidor: todo queda guardado en el navegador del dispositivo.

Una sola app con tres modos:

| Modo | Para quién | Pantalla |
|---|---|---|
| A. Consola del planificador | Planificador de patio (notebook o tablet) | `/planificador` |
| B. Reserva de cita | Conductor (celular) | `/conductor` |
| C. Seguimiento | Conductor (celular, modo cabina) | `/conductor` |
| D. Indicadores del turno | Jefatura / presentación | `/indicadores` |

## Requisitos

- Node.js 20 o superior (`node -v`)
- Chrome en el notebook y en el celular

## Cómo correrla

```bash
npm install
npm run dev
```

Abre la dirección que muestra la terminal (normalmente `http://localhost:5173`).
Para verla en el celular conectado a la misma red wifi, usa la dirección **Network** que aparece en la terminal.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm test` | Pruebas del motor de asignación y de los datos de ejemplo (Vitest) |
| `npm run build` | Revisa tipos y compila la versión final en `dist/` (con service worker) |
| `npm run preview` | Sirve la versión compilada (`http://localhost:4173`) |
| `npm run iconos` | Vuelve a generar los íconos PNG de `public/icons/` |

## Probar que es una PWA de verdad (sin señal)

El service worker **solo funciona en la versión compilada**, no en `npm run dev`:

```bash
npm run build
npm run preview
```

1. Abre `http://localhost:4173` en Chrome y recorre la app una vez (la primera visita guarda todo; aparece
   «Listo: la app quedó guardada en este equipo y funciona sin señal»).
2. F12 → pestaña **Application**:
   - **Manifest**: nombre «SIAP-TPA · Prototipo», íconos 192 y 512 (y uno *maskable*), sin errores.
   - **Service Workers**: `sw.js` activo.
3. **Prueba sin señal**: en Application → Service Workers marca **Offline** (o en Network elige
   **Offline**) y recarga. La app abre igual, muestra el banner «Sin señal: usando datos guardados» y
   sigue mostrando tu cita, el tiempo estimado con su motivo, la posición y el QR de ingreso.
4. **Cola «pendiente de enviar»**: sin señal, reprograma la cita. Queda la marca «Pendiente de enviar» y el
   banner cuenta los cambios. Al quitar Offline aparece «enviando…» y luego «✓ 1 cambio enviado» (sin
   servidor, el envío es simulado).
5. **Lighthouse** (F12 → Lighthouse): revisa *Accessibility* y *Best practices*. Las versiones nuevas de
   Chrome ya no traen la categoría «PWA»; la instalabilidad se revisa en Application → Manifest.

## Publicar en Vercel y llevarla al celular

La app necesita **https** para instalarse y para usar la cámara en vivo; Vercel lo da gratis.

1. En github.com crea un repositorio **vacío** (sin README) llamado, por ejemplo, `siap-tpa-pwa`.
2. En la carpeta del proyecto (la rama ya se llama `main`):
   ```bash
   git remote add origin https://github.com/TU-USUARIO/siap-tpa-pwa.git
   ```
   ```bash
   git push -u origin main
   ```
3. En vercel.com: **Add New → Project →** elige el repositorio → **Deploy**. Vercel detecta Vite; la
   configuración ya está en `vercel.json` (compila con `npm run build`, publica `dist/`, y todas las rutas
   como `/conductor/cita` abren la app). No hay variables de entorno.
4. En el celular abre la dirección `https://…vercel.app` en Chrome → menú ⋮ → **Instalar aplicación** (o
   «Añadir a pantalla de inicio»).
5. Abre la app instalada, recorre la reserva, pon el **modo avión** y vuelve a abrirla: debe mostrar la
   cita, el tiempo, la posición y el QR de ingreso.

Cada `git push` a `main` publica una versión nueva. La app instalada se actualiza sola la próxima vez
que se abre con señal (si no, ciérrala por completo y ábrela de nuevo).

## Guion sugerido para la demo (3 minutos)

Notebook con la consola (`/planificador`) y el Panel de la demo (`/demo`); celular con la app instalada.

1. **Conductor reserva en 2 pasos** (celular): Soy conductor → Freddy Choque → escanea la guía de ejemplo
   (abre `/guia-ejemplo` en el notebook) → la franja recomendada de mañana ya viene marcada → Confirmar.
2. **La consola muestra la cita** (notebook): «Leer QR del celular» con el QR «Modo demo dos dispositivos»
   del celular. Aparece en la cola con la posición sugerida en el bloque 40 y el «¿Por qué?».
3. **El planificador acepta con un toque** y muestra el QR para el celular.
4. **El celular muestra el aviso y el tiempo estimado** al escanear ese QR. En el Panel de la demo,
   «Andes Express adelanta su embarque»: el tiempo sube 6 min con su motivo (vuelve a pasar el QR).
5. **Modo avión**: el celular sigue mostrando la posición, el tiempo y el QR de ingreso para garita.

Si usas un solo notebook, abre el conductor en una ventana angosta y la consola en otra: se sincronizan
solas, sin QR. Antes de empezar toca **Reiniciar demo** en ambos equipos.

**Plan B**: lleva capturas o un video corto del recorrido por si falla el wifi.

## Si algo se complica

- **La página queda en blanco o con un error**: aparece «Algo salió mal en esta pantalla» con botones
  para volver al inicio o reiniciar la demo. Los datos siguen guardados.
- **No se actualiza la versión instalada**: cierra la app por completo y ábrela de nuevo.
- **El QR de dos equipos no abre en el celular**: el notebook debe usar la dirección de red o la de
  Vercel, no `localhost`.
- **La cámara no abre**: usa «Tomar foto de la guía» o «Usar guía de ejemplo».

## Probar la reserva del conductor (Modo B)

1. En el inicio toca **Soy conductor**, acepta el uso de datos y elige un conductor de ejemplo
   (Freddy Choque, boliviano, o Manuel Vega, nacional).
2. **Paso 1, tu guía**: toca **Usar guía de ejemplo**, o escanea el QR de la guía. Para escanear,
   abre `/guia-ejemplo` en el notebook y apunta el celular a ese código.
3. **Paso 2, día y hora**: la franja **Recomendada** (menor espera, fuera de 12:00–17:00 cuando se
   puede) ya viene marcada; toca **Confirmar reserva**. Son 2 pasos y unos pocos toques.
4. Verás tu cita con el **QR de ingreso** para garita, el **SMS simulado** y el botón **Reprogramar**.

La reserva aparece de inmediato en la consola del planificador si la tienes abierta en otra pestaña
del mismo navegador.

**Cámara:** el navegador solo deja usar la cámara en vivo con conexión segura (https o `localhost`).
Si abres la app en el celular con la dirección de red local (`http://192.168...`), usa
**Tomar foto de la guía**, que sí funciona, o publica la app en Vercel (https).

## Probar la consola del planificador (Modo A) y los indicadores (Modo D)

1. Abre **Soy planificador de patio** (`/planificador`) en el notebook.
2. Arriba ves tres indicadores del turno (M1 atención, M4 sugerencias aceptadas, M6 cumplimiento de franja).
3. En la **cola de ingresos** elige una cita pendiente: a la derecha aparece la **posición sugerida**
   (coordenada Baroti), el panel **«¿Por qué esta posición?»** con el aporte de cada criterio y **dos
   alternativas** con su puntaje.
4. **Aceptar**: un toque. **Modificar**: toca una alternativa (o una pila con borde azul en el mapa) y
   luego el **motivo** en un toque (bloque lleno, mantención, pedido del patio u otro).
5. El **mapa del patio** muestra los bloques 10 a 90 con su ocupación (color y texto), el bloque en
   mantención y las marcas de la sugerida y las alternativas; abajo, las bahías y filas del bloque.
6. Si el conductor tiene la app abierta en otra pestaña, recibe el aviso al instante. Si está en otro
   teléfono, escanea el QR que aparece después de decidir. Con **Leer QR del celular** la consola carga
   una cita reservada en el teléfono del conductor.
7. **Ver indicadores del turno** (`/indicadores`) muestra M1 a M8 con valor, meta, línea base y
   semáforo. Se actualizan en vivo; cada tarjeta dice si se calcula con los datos de la demo o si es una
   estimación simulada.

## Probar el seguimiento (Modo C) con el Panel de la demo

El **Panel de la demo** (`/demo`, enlace en el pie de página) simula lo que haría la terminal, para
mostrar el seguimiento en vivo durante la presentación:

1. Con una cita reservada, abre el seguimiento del conductor (`/conductor`) en una ventana angosta
   (o en el modo dispositivo de Chrome) y el Panel de la demo en otra ventana.
2. **Aceptar sugerencia**: el conductor recibe el aviso «Ya tienes posición en el patio».
3. **Andes Express adelanta su embarque 12 h**: el tiempo estimado sube 6 min y muestra el motivo.
4. **Cambiar a … · motivo: Bloque lleno**: aviso «Cambió tu posición» con el motivo, y el tiempo se
   ajusta si cambia de bloque.
5. **Registrar** los hitos (en ruta, antepuerto, garita) y **Atendido**: el conductor ve «Atendido en X
   min, dentro de tu franja» y la encuesta de 5 caras.

En el seguimiento, **Modo cabina** deja solo lo esencial en alto contraste y con cifras más grandes.
Sin conexión aparece el aviso «Sin señal: usando datos guardados» y todo sigue visible.

### Dos equipos sin servidor (QR)

Sin servidor, los equipos se pasan la cita por QR:

- **Del notebook al celular**: en el Panel de la demo (o en el seguimiento) toca **Modo demo dos
  dispositivos** y escanea el código con la cámara del celular. Se abre la app y carga la cita.
- **Del celular al notebook**: en el celular toca **Modo demo dos dispositivos**; en el notebook usa
  **Leer QR del otro equipo** en el Panel de la demo.
- Si algo cambia después, vuelve a generar y escanear el código.
- El notebook debe abrir la app con la dirección de red (no `localhost`) o con la de Vercel, para que el
  enlace del QR funcione en el celular. Los datos viajan después del `#` del enlace, que no se envía a
  ningún servidor.

## Estructura

```
src/
  engine/        Motor de asignación (función pura, determinista) y modelo del patio
  data/          Tipos, datos de ejemplo, fechas y capa de datos (store.ts)
  features/      Pantallas: inicio, conductor, planificador, indicadores, demo (panel de la demo)
  components/    Piezas compartidas: layout, banner de conexión, semáforo, QR, íconos, "Reiniciar demo"
  pwa/           Registro del service worker, estado de conexión y envío de la cola de pendientes
  styles/        Tema visual (colores y tipografías de la presentación)
public/icons/    Íconos de la PWA (generados con scripts/generar-iconos.mjs)
vercel.json      Configuración de despliegue en Vercel
```

## Motor de asignación (`src/engine/assign.ts`)

Recibe un contenedor (nave, puerto de destino, peso, fecha de embarque), el estado del patio y el
momento del cálculo. Devuelve la mejor posición en coordenada Baroti (`bloque-bahía-fila-nivel`,
por ejemplo `40-12-03-2`), dos alternativas y el desglose del puntaje:

| Criterio | Puntos máx. | Regla |
|---|---|---|
| Nave | 30 | Agrupa por nave (misma bahía > mismo bloque > bahía libre) |
| Puerto de destino | 20 | Una pila solo recibe la misma nave y el mismo destino |
| Peso | 15 | Tramos de 3 t; el más pesado arriba no genera remanejo |
| Fecha de embarque | 20 | Embarques próximos en niveles superiores |
| Distancia al frente de atraque | 15 | Pesa más mientras más próximo el embarque |

Descarta bloques en mantención y bloques sobre 90% de ocupación. Mismas entradas, misma salida.

## Datos de la demo

25 citas, 4 naves ficticias, destinos Asia/Europa/EE.UU., conductores nacionales y bolivianos,
9 bloques (10 a 90; el 20 en mantención y el 30 sobre 90%). Las fechas se calculan desde el día
en que se abre la app; si cambia el día, los datos de ejemplo se regeneran solos.
El botón **Reiniciar demo** (pie de página) vuelve a los datos de ejemplo en cualquier momento.

## Estado del proyecto

- [x] Fase 1: base, tema visual, rutas, datos de ejemplo y motor con pruebas
- [x] Fase 2: Modo B (consentimiento, reserva en 2 pasos, QR, franja recomendada, SMS simulado, reprogramar)
- [x] Fase 3: Modo C (seguimiento, modo cabina, sin señal, QR de ingreso, encuesta), sincronización y Panel de la demo
- [x] Fase 4: Modo A (consola completa con mapa del patio) y Modo D (indicadores M1–M8)
- [x] Fase 5: PWA completa (instalable, offline, cola de pendientes), accesibilidad y despliegue en Vercel

## Privacidad (Ley 21.719)

Antes del modo conductor se pide consentimiento: qué datos se usan (nombre, patente, teléfono), para
qué, y que solo se registran hitos (antepuerto y garita), nunca la ubicación continua. No hay
geolocalización, analítica ni servicios externos (ni siquiera tipografías de Google): todo queda en el
dispositivo. «Borrar mis datos» está en el modo conductor.
