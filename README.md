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
| `npm run build` | Revisa tipos y compila la versión final en `dist/` |
| `npm run preview` | Sirve la versión compilada (`http://localhost:4173`) |

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
  components/    Piezas compartidas: layout, semáforo, íconos, "Reiniciar demo"
  pwa/           Service worker y cola de pendientes (Fase 5)
  styles/        Tema visual (colores y tipografías de la presentación)
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
- [ ] Fase 5: PWA completa (instalable, offline, cola de pendientes), pulido y despliegue en Vercel

Las secciones "Probar sin señal" y "Publicar en Vercel" se completan en la Fase 5.
