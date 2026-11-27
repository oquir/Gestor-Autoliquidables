# Plan — FormMaker en celulares y tablets

> **Alcance:** `apps/form-maker` entero, es decir, el maquetador de formularios, el diseñador de PDF y
> el simulador. **No** incluye `tax-filing-manager`. Escrito el 2026-11-26 sobre el código de ese
> día: verificar las rutas antes de usarlas. Marca cada punto como `[x]`, con fecha y commit, y
> tacha su título.

Decisiones del usuario (2026-11-26):

- **Celular: el formulario se edita como lista** (pasos → filas → campos). Tocar un campo abre su
  editor en una hoja que sube desde abajo. La grilla real queda en la vista "Revisar", con zoom.
  **Tablet: la grilla de siempre**, con gestos táctiles.
- **Celular y tablet** entran en el plan.
- **Pruebas reales solo en Android.** El iPhone se emula, y lo que solo pasa en Safari va en
  Riesgos.

Regla de todo el plan: **el escritorio no cambia.** Todo lo nuevo va detrás del modo de layout o de
las variantes `max-*:` y `pointer-coarse:`. Al cerrar cada fase se comparan capturas del escritorio
(1280×720, 1366×768, 1600×1000) contra las de antes.

## 0. Dos ejes independientes: ancho y puntero

- **El ancho decide el layout:**
  - `phone` por debajo de 640 px: vista de lista, todo en hojas.
  - `compact` de 640 a 1279 px: grilla, con los paneles como cajones encima del lienzo.
  - `desktop` desde 1280 px: lo de hoy, sin tocar.
- **El puntero decide la interacción:** con `pointer: coarse` (táctil) hay áreas de toque grandes,
  cromo visible al seleccionar, pulsación larga y pellizcar. Con `fine` todo queda como hoy.
- **Son independientes:**
  - Una tablet Android de 1280×800 en horizontal tiene layout `desktop` con interacción táctil.
  - Una tablet con mouse tiene layout `compact` con interacción de mouse.
  - Un portátil con pantalla táctil sigue en `desktop`.
- **Dónde vive:**
  - `lib/layoutMode` (puro, con prueba): `layoutModeFor(width)` y los cortes en una constante.
  - `hooks/useLayoutMode`: `matchMedia`, sin listeners nuevos por render.
  - Es estado de vista: **nunca** va al borrador ni al export, como `canvasZoom` y los paneles.
- En CSS se usan las variantes de Tailwind 4 (`max-sm:`, `pointer-coarse:`, `pointer-fine:`).
  `hover:` ya se aplica solo con `(hover: hover)`, así que en táctil no queda pegado, pero **lo que
  hoy solo aparece con hover no aparece**: ver B5.

## 1. Fase 0 — Base común (antes de todo)

### [x] ~~B1 Altura y viewport~~ (2026-11-26, 33a941a4)

- **Qué pasa:**
  - `h-screen w-screen` (`100vh`/`100vw`) en `layout/AppLayout.tsx:9`, `PdfDesigner.tsx:65`,
    `FormSimulator.tsx:17` y `atoms/SimulatorLoading`. `min-h-screen` en `molecules/CrashPanel`.
  - En el celular, `100vh` incluye lo que tapa la barra del navegador, así que la barra flotante y
    los pies quedan escondidos.
- **Arreglo:**
  - `h-dvh` y `w-full`, y `min-h-dvh` donde iba `min-h-screen`.
  - En `index.html`, el viewport queda
    `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`.
    El último valor hace que el teclado de Android achique el layout.
  - No se apaga el zoom del usuario: el pellizco se le quita a la página solo dentro de los
    lienzos (B10).
- **Meta:** a 360×800 y 412×915 no queda nada escondido detrás de la barra del navegador.

### [x] ~~B2 Zonas seguras~~ (2026-11-26, 3565de40)

- `viewport-fit=cover` + `env(safe-area-inset-*)`, con utilidades propias en `src/index.css`
  (`@utility`).
- Aplican a la barra flotante (`TOOLBAR_LAYER_CLASSES`, `bottom-4`), `PdfToolbar`, `Toaster`, las
  barras de abajo del celular y las hojas.

### [x] ~~B3 Inputs de 16 px en táctil~~ (2026-11-26, 1aebfe43)

- **Qué pasa:** los inputs son `text-sm` (14 px): `INPUT_CLASSES` en `constants/uiClasses.ts:22`,
  los átomos `Input` y `TextArea`, `PreviewFieldControl.constants.ts:2`, `SEARCH_INPUT_CLASSES` y
  `AFFIX_INPUT_CLASSES`. Safari en iPhone acerca la página al enfocar un input de menos de 16 px.
- **Arreglo:** `pointer-coarse:text-base` en esas constantes. El tema de CodeMirror en
  `molecules/ScriptEditor` sube a 16 px en táctil.

### [x] ~~B4 Áreas de toque~~ (2026-11-26, 722528aa)

- **Qué pasa:** hay muchos botones de 13 a 16 px de ícono y textos de `text-[11px]`: `IconButton`,
  la X de `StepTabChip`, las asas (`FieldDragHandle`, `RowDragHandle`, `FieldResizeHandle`), la
  barra flotante y la barra del PDF.
- **Arreglo:**
  - Una clase compartida en `constants/` que agranda el área de toque **sin cambiar el dibujo**:
    un `::after` con `-inset-*` solo en `pointer-coarse:`.
  - La meta es 44×44 px. El mínimo de WCAG 2.5.8 es 24 px.

### [x] ~~B5 Lo que hoy solo aparece con hover~~ (2026-11-26, 0151e6b1)

- **Qué pasa:**
  - `CHROME_ON_FIELD_CLASSES` y `CHROME_ON_ROW_CLASSES` (`uiClasses.ts:41-45`) muestran el cromo con
    `group-hover` o `focus-within`.
  - En táctil eso depende del foco: Android enfoca el botón al tocarlo y Safari no. Una fila vacía
    no tiene nada que enfocar, así que su barra (asa, columnas, estilos, borrar) no se puede
    alcanzar.
  - El campo seleccionado con Mover ya fija su cromo (`CanvasRow.tsx`, `pinnedFieldId`): "es el
    camino del teclado y de lo táctil". Ese camino se reutiliza.
- **Arreglo:**
  - En `pointer-coarse:` la barra de cada fila se ve siempre, compacta (asa y ⋯), y entera en la
    fila del campo seleccionado.
  - Los textos que nombran gestos de mouse tienen una versión táctil, con `pointer-fine:hidden` y
    `pointer-coarse:hidden` y sin JS:
    - "Haz clic o arrastra un campo al lienzo" (`Sidebar.tsx`).
    - "doble clic… clic derecho" (el vacío de `Sidebar.tsx`).
    - "Shift+clic en otra celda" (`PdfSidebar.tsx`).

### [x] ~~B6 Globos de ayuda en táctil~~ (2026-11-26, 6f2a4573)

- **Qué pasa:** en `atoms/Tooltip`, `useClick({ ignoreMouse: true })` abre el globo al tocar. En un
  botón, un mismo toque ejecuta la acción **y además** abre el globo.
- **Arreglo:**
  - En táctil, el toque abre el globo solo en referencias informativas (`InfoHint`, insignias,
    íconos de estado).
  - En botones no se abre. Cada botón de solo ícono ya lleva `aria-label`, y en los menús del
    celular se ve con su texto.
  - Se decide dentro de `atoms/Tooltip`, que sigue siendo el único lugar de los globos: nada de
    `title=` nativo.

### [x] ~~B7 Hojas, cajones y modales~~ (2026-11-26, e312e9cf, 3a13d320, 4616ccea, f8596708)

- **Nuevo `molecules/BottomSheet`:**
  - Fondo oscuro detrás y alturas "asoma", "media" y "completa", con tope `max-h-dvh` y respeto de
    la zona segura.
  - Foco atrapado (`useModalKeyGuard`), `inert` en el resto de la pantalla y cierre con Escape.
  - Cerrar arrastrando hacia abajo es opcional.
- **Nuevo `molecules/SideDrawer`**, para el layout `compact`.
- **Trampa:** nada que contenga un `ModalShell` puede quedar con `transform`, `filter`,
  `backdrop-filter`, `will-change` ni `container-type` (invariante de `CLAUDE.md`). Si un cajón
  conserva el `translate` de su animación, los modales que abre se miden contra él. La animación
  tiene que terminar sin transform o ir en un elemento interno.
- **`ModalShell` a pantalla completa en `max-sm:`**, en `ModalShell.constants.ts`
  (`OVERLAY_CLASSES` sin `p-4`, `PANEL_CLASSES` con `h-dvh` y sin bordes redondeados). Con eso
  cubre `SetupWizardModal`, `DraftRecoveryModal`, `ExportReviewModal`, `FieldRulesModal`
  (`max-w-3xl`), `SimpleCalcModal`, `FieldOptionsModal`, `ProjectImportModal` y `PdfImportModal`.
- **Menús que se abren encima** (`RowColumnsMenu`, `RowStylesMenu`, `MoveToStepMenu`,
  `CanvasZoomControl`, `PdfZoomControl`, el selector de color): en el celular salen como hoja.

### [x] ~~B8 El botón Atrás de Android~~ (2026-11-26, c05ea4cd)

- **Qué pasa:** simulador, diseñador de PDF, hojas y modales son banderas del store, no rutas.
  Atrás desde el simulador **se sale de FormMaker**.
- **Arreglo:**
  - Al abrir cualquiera de ellos se agrega una entrada al historial con `history.pushState`, sin
    cambiar la URL, porque el PDF lee `?impuesto=`. Atrás cierra lo de más arriba.
  - La pila es pura: `lib/backStack`, con prueba. El hook va en `hooks/`.
- **Meta:** Atrás nunca saca de la app con algo abierto.
- **Hallazgo (2026-11-27, corregido en el S7):** en `pnpm dev` con puntero táctil,
  toda capa con `useBackClose` se cierra al abrirse. `StrictMode` monta, limpia y vuelve a montar el
  efecto: la limpieza hace `history.back()` y el segundo `pushState` llega antes; Chrome vuelve a la
  entrada de carga (piso 0) y `popstate` cierra la capa. Sin verificar: podría pasar en producción si una
  capa se cierra y otra se abre en el mismo instante (la misma carrera). B8 se verificó con `vite preview` (sin `StrictMode`).
  Arreglo: el cierre espera un microtask y se cancela si la misma capa se vuelve a montar
  (`pendingCloses` en `useBackClose`). Verificado con táctil emulado en `pnpm dev`.

### [x] ~~B9 Que el guardado no se pierda~~ (2026-11-26, dd14b9e4)

- **Qué pasa:**
  - El borrador se guarda cada **3 minutos** (`useAutosave.constants.ts`), y el PDF 800 ms después
    del último cambio, con un último guardado al desmontar.
  - El celular mata las pestañas en segundo plano sin avisar: al cambiar de app se pierden hasta 3
    minutos de trabajo.
- **Arreglo:**
  - Guardar también en `visibilitychange` (al quedar `hidden`) y en `pagehide`: el formulario con
    `saveDraftOrWarn`, el PDF con lo pendiente de `startPdfAutosave`. Esto también ayuda en el
    escritorio.
  - Pedir `navigator.storage.persist()` una vez.
- **Riesgo iOS:** Safari borra `localStorage` a los 7 días sin visitar el sitio, y la cuota es menor
  (el PDF con imágenes en base64). Se sugiere exportar el proyecto. La salida ya prevista en
  `Decisiones.md` es IndexedDB.

### [x] ~~B10 Pellizcar para hacer zoom~~ (2026-11-26, 4811ed95)

- **Qué pasa:** el zoom de los dos lienzos es Ctrl+rueda (`useCanvasViewport.ts`, `PdfCanvas.tsx`).
  En el celular, pellizcar acerca **la página entera**.
- **Arreglo:**
  - `touch-action: pan-x pan-y` en los dos puertos (`[data-canvas-scroll]`): un dedo desplaza
    nativo y dos dedos acercan el lienzo.
  - La cuenta es pura, en `lib/canvasZoom` (`pinchZoom` con su ancla en el punto medio), con prueba.
  - El ancla del PDF ya existe (`restoreZoomAnchor`).
  - Ctrl+rueda sigue igual en el escritorio.

### [x] ~~B11 Cómo se prueba en el celular~~ (2026-11-26, sin código: receta verificada y ampliada)

- Android por USB: depuración USB y `chrome://inspect` → Port forwarding `5174 → localhost:5174`.
  En el celular se abre `http://localhost:5174`.
  - Es contexto seguro: el portapapeles funciona, y no hay que tocar `vite.config.ts`.
  - Por la red local con `http://192.168…`, `navigator.clipboard` no existe y `copyTextOrWarn`
    avisaría.
- Emulación en Chrome o Edge:
  - Celulares: 360×800, 390×844 (iPhone) y 412×915.
  - Tablets: 768×1024, 820×1180 vertical y horizontal, 1280×800 táctil.
- Verificado el 2026-11-26 contra el código: `vite.config.ts` fija `5174` con `strictPort` en dev y
  en preview, y `lib/clipboard` (`copyTextOrWarn`) avisa con un toast si `navigator.clipboard` no
  existe o rechaza.
- Cómo se verificó B1–B10 sin celular (Chrome headless por DevTools protocol, scripts de un solo uso
  en el scratchpad, como en `Decisiones.md`):
  - `vite preview --port 5199 --strictPort` aparte, para no tocar el dev server del usuario. Abre en
    `localhost`, no en `127.0.0.1` (ahí rechaza la conexión).
  - Ancho: `Emulation.setDeviceMetricsOverride` (`mobile: true` para celular y tablet).
  - Dedo: `Emulation.setTouchEmulationEnabled` hace que `pointer: coarse` sea verdad;
    `Input.dispatchTouchEvent` da toques y pellizcos (dos `touchPoints`) reales.
  - Atrás de Android: `history.back()` en la página dispara el mismo `popstate`.
  - Página oculta: redefinir `document.visibilityState` y disparar `visibilitychange` o `pagehide`.
  - Lo que todavía no existe en la app se probó en una página temporal en la raíz
    (`__demo.html` + `.tsx` servidos por `vite`), borrada al terminar.
  - Comparar contra la versión anterior: `git stash push -- src`, `vite build` y correr; después
    `git stash pop`, `vite build` y volver a correr. Así se ve que la prueba detecta el cambio.
  - **Lo que la emulación no muestra** y queda para el Android real: la barra del navegador que se
    esconde (`dvh`), las zonas seguras reales, el teclado que achica la pantalla, la pulsación larga
    y el doble toque, `storage.persist()` y si Android mata la pestaña de fondo.

## 2. Fase 1 — Simulador (lo más sencillo)

Ya apila las filas por debajo de 40rem (`@container/form`, verificado a 390 px en
`Decisiones.md`) y la cabecera ya se adapta (`sm:`).

- [x] ~~**S1 Navegación al alcance del pulgar:**~~ (2026-11-27, 569c6823) en `phone`, el pie de
      `PreviewForm` (Anterior · Paso N de M · Siguiente/Enviar) queda fijo abajo, con la zona segura.
  - `sticky` dentro de la tarjeta, no `fixed`: el modal de entrada lo sigue tapando y, pasada la
    tarjeta, vuelve a su lugar. `-bottom-4` compensa el `py-4` del scroll (Chrome mide el sticky
    dentro de ese padding).
  - Reiniciar pasa a ícono para que todo entre en una línea a 360 px; al cambiar de paso la tarjeta
    vuelve arriba; `scroll-pb-20` deja el campo enfocado por encima del pie.
  - Verificado en Edge headless a 390×844 y a 1280×720 (escritorio igual).
- [x] ~~**S2 Toques e inputs:**~~ (2026-11-27, 174caf07)
  - B3 en todos los controles (ya estaba: todos los inputs del simulador tenían `pointer-coarse:text-base`).
  - El `toggle_group` (`py-1 text-xs`), las casillas y las opciones se pueden tocar en toda su fila.
  - En `pointer-coarse:` (`PreviewFieldControl.constants.ts`): chips y filas con `min-h-11` (44 px),
    casilla de 20 px, letra de las filas a 16 px. Tamaño real y no `touch-target`: el `::after` de
    un chip pisaría al vecino. Medido en Edge headless; el escritorio no cambia.
- [x] ~~**S3 El teclado correcto en cada campo:**~~ (2026-11-27, beb9f252; el NIT queda en veremos)
  - Revisar `inputMode`, `enterKeyHint` y `autoComplete` por tipo. Número ya usa `decimal`, y la
    máscara de fecha ya usa `numeric`.
  - `tel` y `email` (`PreviewFieldControl.tsx:114`) y el NIT.
  - `enterKeyHint="next"` en los campos que no son el último.
  - Hecho en `PreviewForm` (`PreviewForm.utils.ts`): "siguiente" en cada campo de texto y "listo" en
    el último, por paso y en el modal de entrada; en táctil Enter pasa al siguiente o cierra el
    teclado (fuera de un `<form>` Android no salta solo). Con mouse Enter sigue sin hacer nada.
    `tel`/`email` ya traían su teclado y número ya usaba `decimal`: sin cambios.
  - **NIT y documentos: en veremos (decisión del usuario, 2026-11-27).** Se exportan como `text` y
    que sean solo dígitos vive en el regex dentro del string de Zod. Caminos: deducirlo del regex
    (frágil, el consumidor copia la deducción) o una opción "Teclado numérico" en el campo (palabra
    nueva en el JSON: migración, `projectMeta.requires`, consumidor). No bloquea: el teclado de
    letras deja pasar a números, y la validación no deja avanzar sin un documento válido.
- [x] ~~**S4 Resultados en una hoja:**~~ (2026-11-27, 1f630608; "Volver al lienzo" queda "Volver"
      en el celular para que la cabecera entre en 360) en `phone`, `PreviewResults` (payload, valores, errores) sale
      de un botón "Resultados" en la cabecera, en lugar de quedar debajo del formulario largo. Desde
      `lg:` queda igual que hoy.
- [x] ~~**S5 Modal de entrada:**~~ (2026-11-27, 73addac1; en `max-sm:` deja de flotar, esconde el
      paso de atrás y pega su pie abajo) el que va dentro de `PreviewForm` (`max-w-2xl`, `max-h-full`) en el
      celular ocupa la tarjeta, con sus botones visibles con el teclado abierto.
- [x] ~~**S6 Lo que se abre encima:**~~ (2026-11-27, c123b5e8; la lista va a pantalla completa en
      `max-sm:` y en `dvh`; fecha e ℹ ya estaban)
  - La lista de `PreviewSearchSelect` dentro de la pantalla y por encima del teclado.
  - El selector de fecha (`showPicker`, que tiene respaldo).
  - Los ℹ de `field.tooltip` ya se abren al tocar.
- [x] ~~**S7 Atrás cierra el simulador** (B8).~~ (2026-11-27, 748554a7 y c58ed36a: ya lo hacía en
      producción; se corrigió el cierre al abrir con `StrictMode` y la lista de `search_select` entró
      en la pila)
- [ ] **S8 El consumidor:** lo que el simulador hace en el celular y no va en el JSON (inputs de
      16 px, navegación fija, filas apiladas) va a Known gaps para que `FrontAutoliquidable` lo copie.
- **Meta:**
  - A 360, 390 y 412 px no hay scroll horizontal.
  - El ICA se llena completo con el dedo en un Android.
  - El teclado nunca tapa el campo activo.

## 3. Fase 2 — Maquetador en tablet y táctil (grilla)

- [ ] **T1 Paneles como cajones:**
  - En `compact`, el riel queda. El panel izquierdo (320 px) y el derecho (`RightSidebar`, con
    `CanvasTabs` y Proyecto) se abren **encima** del lienzo, con fondo oscuro detrás y uno a la vez.
  - El lienzo conserva su ancho, y el `ResizeObserver` del puerto no se dispara al abrirlos.
  - `AppLayout` elige según el modo. Se reutilizan `isSidebarOpen` e `isRightSidebarOpen`.
  - Ojo con la trampa de B7.
- [ ] **T2 Sensores táctiles (`hooks/useDragAndDrop`):**
  - `TouchSensor` con su propia constante de módulo, junto a `POINTER_SENSOR_OPTIONS`: retardo de
    unos 200 ms y tolerancia de unos 8 px, para que la paleta y los paneles sigan desplazándose.
  - El sensor de puntero queda para mouse y lápiz.
  - `touch-action: none` en las tres asas.
  - Se mantienen las invariantes de cascarón delgado y de manejadores estables.
- [ ] **T3 Arrastrar con el dedo:**
  - La copia que se arrastra va **por encima del dedo** en táctil. Hoy `centerOverlayOnCursor` la
    centra debajo, y el dedo la tapa.
  - El autoscroll de dnd-kit en los bordes ya existe.
  - `onDragCancel` sigue siendo clave, porque en táctil `pointercancel` es frecuente.
- [ ] **T4 Sin Shift ni Shift+Ctrl:**
  - Hoy la columna exacta se elige arrastrando con modificadores.
  - En Atributos se agrega un control "Columna de inicio" junto al ancho (`AttributesPanel.tsx:143`
    hoy solo muestra "desde col N"). Usa `moveField(fieldId, rowId, { colStart, colSpan })` con
    `getFreeRuns` y `getMaxSpanAt`. Verificar que `moveField` acepte la misma fila.
  - Se comparte con el celular.
- [ ] **T5 Sin clic derecho ni doble clic:**
  - Tocar selecciona y fija el cromo. El campo seleccionado muestra un botón ⋯ que abre
    `FieldContextMenu`, que es todo un editor de pestañas: como menú en la tablet y como hoja en el
    celular.
  - Android también dispara `contextmenu` con la pulsación larga. Safari no, así que el botón es el
    camino seguro.
- [ ] **T6 Mover a otro paso sin soltar en la pestaña:**
  - Las zonas para soltar viven en el panel derecho, que en `compact` está cerrado mientras se
    arrastra.
  - `MoveToStepMenu` también para la selección de un solo campo (menú ⋯) y en la barra de la fila
    (`moveRowToStep`).
- [ ] **T7 Selección múltiple:**
  - En táctil, con la herramienta Selección, tocar suma o quita (ya existe).
  - El marco queda solo para mouse y lápiz: con el dedo gana el desplazamiento.
  - La barra de acciones de la selección ya existe.
- [ ] **T8 Pellizcar en el lienzo** (B10 en `useCanvasViewport`). La Mano y Espacio sobran en
      táctil, porque el dedo ya desplaza: la Mano se oculta con `pointer-coarse`.
- [ ] **T9 Barra flotante y chip plegado:**
  - `CanvasToolbar` ya se compacta con `@container/toolbar`. Se revisa en 640 a 1279, con la zona
    segura y sin quedar debajo de los cajones.
  - `CollapsedRightSidebar` igual.
- **Meta:**
  - A 820×1180 y 1180×820 con el dedo: agregar, arrastrar, cambiar ancho, reordenar filas, mover a
    otro paso, seleccionar varios y deshacer.
  - El escritorio idéntico.

## 4. Fase 3 — Maquetador en el celular: la vista de lista

- [ ] **P1 La pantalla:**
  - **Arriba:** paso anterior y siguiente, el nombre del paso (abre una hoja con `CanvasTabs`),
    `SaveStatus`, **Subir** (el único naranja) y ⋯. El menú ⋯ lleva:
    - Guardar, Simulador, Diseñar PDF, Abrir proyecto y Exportar.
    - Proyecto: el contenido de `RightSidebar`, con `FormSummary` y `PdfPreviewBlock`.
    - Modo oscuro y Bajo rendimiento.
  - **Abajo:** + (agregar), Deshacer, Rehacer, Vista y Seleccionar.
  - Sin riel ni paneles: todo va en hojas. Los botones usan `ACTION_TIER_CLASSES`.
- [ ] **P2 `organisms/CanvasList` (nuevo):**
  - Su modelo es puro, en `lib/canvasList`, con prueba:
    - Pasos → filas → campos, en orden de `colStart`, como `PreviewRowsGrid`.
    - Los grupos repetibles como secciones.
    - Si cada fila puede subir o bajar, según `resolveRowDrop` (`lib/rowOrder`).
  - **Tarjeta de fila:** "Fila N · C columnas", con un menú ⋯ que lleva columnas
    (`updateRowColumns`), estilos, mover a paso, "Agregar campo aquí" y eliminar.
  - **Cada campo:** etiqueta (o la vinculada), `FieldTypeBadge`, íconos de estado y "4/16 · col 1".
  - Los selectores devuelven referencias estables (los centinelas `NO_ROWS` y compañía).
- [ ] **P3 Editar un campo:**
  - Tocar abre una hoja con las mismas pestañas de `FieldContextMenu` (Atributos, Validaciones,
    Estilos, Lógica, Mapeo).
  - Se extrae un `FieldEditorTabs` compartido entre el menú y la hoja, para no duplicarlo.
  - Arriba van el nombre, borrar y mover.
- [ ] **P4 Agregar:**
  - "+" abre una hoja con la paleta (`FieldPalette`). Tocar agrega con
    `appendFieldToActiveCanvas`, que ya existe.
  - En el menú de una fila, "Agregar campo aquí" usa `addFieldToRow(rowId, tipo)`.
  - En la misma hoja van + Fila y + Grupo repetible.
- [ ] **P5 Reordenar y mover:**
  - Filas con ↑↓ (`moveRow` con un `RowDropTarget`).
  - Campos con "Mover a otra fila…" (`moveField`).
  - Pasos con `moveRowToStep` y `moveFieldsToStep`.
  - Arrastrar dentro de la lista (dnd-kit sortable, pulsación larga) queda **para después**,
    opcional.
- [ ] **P6 Ancho y columna:** en la hoja, el control de ancho y la "Columna de inicio" de T4.
- [ ] **P7 Seleccionar varios:** modo con casillas (`toggleFieldSelection`) y la barra de abajo con
      mover a paso y eliminar, con la misma lógica de `CanvasToolbar`.
- [ ] **P8 Grupos repetibles:**
  - Sección con sus filas. Su ⋯ abre lo que hoy edita `RepeatableGroupBand`.
  - Las reglas del grupo no cambian: una fila no entra ni sale de un grupo.
- [ ] **P9 La vista "Revisar":**
  - La grilla real (`Canvas`) con zoom para que entre, y pellizcar. Tocar un campo abre su hoja.
  - En el celular no se arrastra.
  - `ViewModeSwitch` en `phone`: Lista · Revisar · JSON · Payload. Si `CanvasViewMode`
    (`types/ui.ts:13`) gana un valor, sigue siendo estado de vista, fuera del borrador.
  - `ZOOM_MIN` (0,5) baja en el celular.
- [ ] **P10 Lo demás en hojas a altura completa:**
  - Lógica (CodeMirror a 16 px), Mapeo API, Catálogos y Fechas.
  - JSON y Payload ya se virtualizan, y `JsonSearchBar` ya se adapta con `@xs`.
- [ ] **P11 Asistente y recuperación del borrador** a pantalla completa (B7).
- **Meta:**
  - A 390×844 y 360×800, solo con el dedo: armar un formulario corto desde cero y editar el ICA
    (etiquetas, validaciones, un script).
  - Reordenar filas, mover un campo a otro paso, deshacer, exportar y abrir el simulador.
  - Sin scroll horizontal fuera de Revisar.

## 5. Fase 4 — Diseñador de PDF en tablet y celular

- [ ] **D1 Cabecera:**
  - Hoy lleva Volver, título, estado, papel, tema, Abrir…, Descargar HTML y Subir en una sola
    línea (`PdfDesigner.tsx`).
  - En `compact` y `phone` quedan ←, el título recortado, el punto de estado y **Subir**. El menú ⋯
    lleva Abrir…, Descargar HTML, **Imprimir** (lo que hoy solo hace Ctrl+P con `printPdfHtml`),
    papel y tema.
- [ ] **D2 La barra lateral** (`aside w-80` + `PdfSidebar`):
  - En `compact`, un cajón.
  - En `phone`, una hoja con Hojas | Selección | Documento. Al seleccionar una celda o un bloque se
    abre a media altura, y el lienzo se desplaza para que la selección quede visible encima.
- [ ] **D3 Zoom que entre:**
  - La hoja Carta mide unos 816 px. Con `PDF_ZOOM_MIN` = 0,5 y `FIT_GUTTER_PX` = 64, ocupa
    472 px y **no entra en 390**.
  - Se baja el piso del ajuste en el celular. El relleno de `.fm-doc` (32 px, en
    `PdfCanvas.constants.ts:14`) pasa a 12 px, y `FIT_GUTTER_PX` va con él: `Decisiones.md` pide
    cambiarlos juntos, así que el margen pasa a ser un parámetro de `fitPdfZoom`.
  - Actualizar `tests/lib/pdfDesign.test.ts`.
  - Pellizcar (B10) y el botón "Ajustar al ancho".
- [ ] **D4 Tocar celdas:**
  - Tocar selecciona (ya funciona). Con Selección múltiple, tocar otra celda arma el rectángulo
    (ya existe, `handleSelectCell`).
  - **Arrastrar entre celdas con el dedo no funciona hoy.** `PdfCanvas` usa `pointerover`, y un
    puntero táctil queda capturado por la celda donde empezó, así que nunca llega a las otras.
  - Con el dedo se usa `pointermove` + `shadowRoot.elementFromPoint`, y `touch-action: none` en
    `.fm-doc[data-tool="select"]` (`CANVAS_CSS`). En esa herramienta, dos dedos desplazan y acercan
    con un gesto propio.
- [ ] **D5 La barra del PDF (`PdfToolbar`):**
  - Íconos y zoom (−, ajustar, +), y la selección "N celdas · Combinar · Deseleccionar" entra en 360.
  - La Mano se oculta en táctil. Va con la zona segura.
- [ ] **D6 Paneles en la hoja:**
  - `PdfCellPanel`, `PdfStyleFields`, el selector de color (`react-colorful` ya es táctil),
    `PdfClassesPanel`, `PdfComponentPanel`, `PdfHtmlBlockPanel` y `PdfImageSourceField`. "Elegir
    archivo…" abre la cámara o la galería.
  - Inputs de 16 px. Con el teclado abierto, el campo que se edita sigue a la vista.
- [ ] **D7 Archivos:**
  - Abrir (`input type=file`), Descargar (`a.download` va a Descargas en Chrome de Android), Subir
    (la petición falsa) e Imprimir.
  - En iPhone no se prueba: queda en Riesgos.
- [ ] **D8 Atrás cierra el diseñador** (B8), con el guardado de B9.
- [ ] **D9 Rendimiento:**
  - La plantilla del ICA tiene 226 celdas en una sola tabla.
  - Medir en un Android de gama media, con DevTools remoto: tocar para seleccionar, teclear en una
    celda y pellizcar. Probar también con bajo rendimiento.
- **Meta:**
  - En un Android, solo con el dedo: abrir el ICA, seleccionar una celda, cambiar texto y color,
    combinar dos celdas, agregar una fila, deshacer y descargar el HTML.
  - En la tablet, lo mismo con el cajón.

## 6. Fase 5 — Cierre

- [ ] **C1 Rendimiento** en gama media, en un Android real y con CPU ×4 en emulación:
  - Del toque a la respuesta, menos de 100 ms.
  - Teclear en un panel, menos de 16 ms de JS.
  - Montar la lista del paso 1 del ICA, menos de 200 ms.
  - Si conviene que el bajo rendimiento arranque activado en táctil, **lo decide el usuario**: hoy
    es un interruptor.
- [ ] **C2 Pasada completa:** Android real, más la emulación de iPhone y iPad.
- [ ] **C3 Documentación:**
  - `CLAUDE.md`: rehacer el Known gap de responsive y agregar las invariantes nuevas (los dos ejes,
    hojas y cajones sin transform, la pila de Atrás, `touch-action` por herramienta).
  - `Decisiones.md`: una sección por fase.
  - Los pendientes del consumidor.
- [ ] **C4 En cada fase:** `pnpm test`, `pnpm lint`, `pnpm build` y `pnpm check:chunks` en verde.
      Las hojas viven en el chunk inicial y no pueden importar nada del simulador ni del PDF.

## 7. Pruebas

- **Vitest (solo lógica pura, como pidió el usuario):**
  - `lib/layoutMode`, `lib/backStack`, `lib/canvasList` (modelo y validez de ↑↓) y `pinchZoom`.
  - `fitPdfZoom` con margen y piso.
  - Las acciones nuevas del store en `tests/store/`.
  - Cada tanda se cierra rompiendo una regla a propósito. **Nada de componentes, hooks ni lienzo.**
- **A mano:** los tamaños de B11 en claro y oscuro. En Android real por `chrome://inspect`.
- **Escritorio sin cambios:** capturas en Edge headless a 1280×720, 1366×768 y 1600×1000, antes y
  después de cada fase.

## 8. Riesgos y trampas

- **iPhone sin probar:**
  - Zoom al enfocar (B3).
  - `100vh` y el teclado: Safari no respeta `interactive-widget`.
  - El borrado de `localStorage` a los 7 días.
  - No hay `contextmenu` con la pulsación larga.
  - Descargas y `showPicker`.
  - Se mitigan con lo estándar, pero quedan sin verificar.
- **Invariantes de `CLAUDE.md` que se pueden romper:**
  - Transform en el contenedor del chip, que rompe `ModalShell`.
  - Cascarones delgados de dnd-kit y opciones del sensor como constante de módulo.
  - Selectores con referencias estables.
  - Estado de vista fuera del borrador.
  - Globos solo con `atoms/Tooltip`.
  - Variantes `dark:` en cada superficie nueva.
  - Fronteras perezosas.
- **Gestos:**
  - El desplazamiento nativo le gana al arrastre: se resuelve con `touch-action` en las asas.
  - Dos dedos frente al zoom de la página: se resuelve con `touch-action` en los puertos.
- **`RichTextEditor` (contentEditable) con el teclado de Android:** composición y autocorrector.
- **El consumidor** tiene que copiar las reglas de celular del simulador.

## 9. Fuera de alcance

- `tax-filing-manager` (el dashboard).
- PWA, uso sin conexión o instalar la app.
- Apps nativas.
- Arrastrar dentro de la lista del celular (P5, para después).
- Un layout propio para el celular en horizontal (entra como `phone` o `compact` según su ancho).
