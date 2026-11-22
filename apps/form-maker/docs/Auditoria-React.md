# Auditoría de render y estado de React (2026-11-21)

> **Alcance:** FormMaker entero (`apps/form-maker/src`): re-renders, `useState`, ciclo de render,
> hooks, rendimiento e integridad funcional. Diagnóstico de solo lectura; las correcciones van por
> fases y el usuario aprueba cada una. Marca cada punto como `[x]`, con fecha y commit.

**Método y límites.** Revisión estática de todo `src/` (190 `.tsx`, 966 `.ts`): las 302
suscripciones a los stores, los 55 efectos, todos los `setState` dentro de efectos, las llaves de
las listas, los flujos asíncronos y las rutas calientes (lienzo, arrastre, simulador, vista JSON,
diseñador de PDF). El comportamiento de dnd-kit se confirmó leyendo la librería instalada. **No se
midió con el Profiler**: los costos son estimaciones a partir del código y del tamaño real de la
plantilla ICA (~76 campos en ~10 pasos; el PDF ICA, una hoja con cientos de celdas anidadas).
Contexto técnico: React 19.2 con StrictMode, Zustand 5 + zundo, sin React Compiler, **ningún
`React.memo` en el proyecto**. Los números de línea son los del 2026-11-21.

## Resumen

- **1 bug de prioridad alta**: cancelar un arrastre (Escape, Alt+Tab, redimensionar) deja el editor
  en un "arrastre fantasma".
- **4 problemas reales de prioridad media**: los schemas de Zod se rehidratan en cada tecla del
  simulador; el selector de color escribe al store en cada movimiento; el lienzo del PDF repinta y
  vuelve a sanear todas las celdas en cada tecla, zoom o clic; y el guardado del borrador falla en
  silencio cuando se llena `localStorage`.
- **1 problema estructural**: las ediciones del formulario no comparten estructura, lo que
  contradice el invariante de `CLAUDE.md`.
- **7 bugs o riesgos de prioridad baja** y **7 oportunidades** que no conviene tocar sin medir.
- **No hay bucles de render ni `setState` durante el render.** Todos los `setState` dentro de
  efectos están protegidos.

---

## A. Problemas reales

### [x] ~~A1 · ALTA · Cancelar un arrastre deja el editor en un "arrastre fantasma"~~ (2026-11-21, «Limpia el estado del arrastre al cancelarlo»)

> **Hecho.** Reproducido antes del cambio en Chrome (fila y campo × Escape, `resize` y
> `visibilitychange`: Pasos forzado, una fila desplazada, Ctrl+→ bloqueado) y limpio después;
> soltar sigue moviendo la fila. Al cancelar, el overlay vuelve al origen con la animación por
> defecto, igual que al soltar. **Hallazgo nuevo, sin tocar:** el `dropAnimation={null}` de
> `FormBuilder` para filas no tiene efecto (cuando dnd-kit lo lee, `activeDrag` ya es `null`), así
> que soltar una fila también anima.

- **Dónde:** `components/organisms/FormBuilder/FormBuilder.tsx:66-71` (`DndContext`) y
  `hooks/useDragAndDrop/useDragAndDrop.ts:206` (`resetDragState`).
- **Causa:** el `DndContext` recibe `onDragStart`, `onDragMove` y `onDragEnd`, pero **no
  `onDragCancel`**. El `PointerSensor` de dnd-kit cancela con Escape, `pointercancel`,
  `visibilitychange` (Alt+Tab o cambiar de pestaña) y `resize`, y en esos casos llama solo a
  `onDragCancel` (`node_modules/@dnd-kit/core/dist/core.esm.js:1441-1446, 1581-1598, 3162`). Así
  `resetDragState()` nunca corre.
- **Impacto:** quedan en el store `rowDrag`, `draggingFieldId`, `dragPlacement`, `rowDropTarget` y
  `hoveredTransferTarget`, y `activeDrag` en `FormBuilder`. El efecto de `useDragAndDrop.ts:195`
  deja los listeners de `pointermove` y `keydown` activos, y siguen escribiendo al store en cada
  movimiento del mouse. Lo que ve el usuario:
  - con una fila, las filas quedan desplazadas y "bailan" al mover el mouse;
  - con un campo, el panel derecho queda forzado en la pestaña Pasos con los puntos de destino;
  - Ctrl+←/→ queda bloqueado ("no a mitad de un arrastre").

  Solo se recupera haciendo otro arrastre completo.

- **Solución:** `handleDragCancel` en `useDragAndDrop`, que llame a `resetDragState()`; devolverlo
  en el hook (`types/dragAndDropReturn.ts`) y pasarlo como `onDragCancel` en `FormBuilder`.

### [x] ~~A2 · MEDIA · El simulador rehidrata todos los schemas de Zod en cada tecla~~ (2026-11-21, medido y descartado)

> **No se hace (decisión del usuario).** La caché se implementó, pasó todas las pruebas y se
> descartó al medir: el ICA tiene 75 campos pero **13 textos de schema distintos**, y el motor ya
> reutiliza la compilación de un `new Function` con el mismo texto. Hidratar costaba **0,084 ms**
> por tecla (con caché, 0,011 ms; `validateRuntime` completo, 0,15 ms). La ganancia no se nota y la
> caché exigía que los schemas no guarden estado. La auditoría lo sobreestimó: **medir antes de
> implementar** lo que queda de rendimiento (A3, A4).

- **Dónde:** `lib/runtimeValidation/runtimeValidation.ts:32` → `lib/zodHydrate/zodHydrate.ts`
  (`hydrateFieldSchemas`), invocado desde `hooks/useFormPreview/useFormPreview.ts:66`.
- **Causa:** `validation` depende de `snapshot`, que cambia en cada tecla. `validateRuntime`
  vuelve a llamar a `hydrateFieldSchemas`, que hace un `new Function` y arma un schema de Zod por
  cada schema del formulario aunque el modelo no cambió. Los scripts sí tienen caché
  (`compileCached` en `lib/scriptRuntime/scriptRuntime.utils.ts`); los schemas no.
- **Impacto:** compilar y construir en cada pulsación un schema por cada campo con validación, más
  sus variantes (decenas en el ICA). Es el cálculo repetido más caro del simulador.
- **Solución:** caché por texto del schema dentro de `lib/zodHydrate` (`Map` de módulo, con el
  patrón de `compileCached`). La salida (`schemas` e `issues`) es idéntica; los schemas de Zod no
  guardan estado, así que compartirlos es seguro. No cambia ninguna firma.

### [x] ~~A3 · MEDIA · El selector de color escribe al store en cada movimiento del puntero~~ (2026-11-22, sin parche: absorbido por la causa, Fase 2)

- **Dónde:** `components/molecules/ColorPickerField/ColorPickerField.tsx:50`
  (`<HexColorPicker onChange={onChange}>`). Lo usan `panels/StylesPanel` (campos del formulario) y
  `pdf/PdfStyleFields` (celdas del PDF).
- **Causa:** `react-colorful` llama a `onChange` en cada movimiento mientras se arrastra, y el
  `onChange` escribe directo al store.
- **Impacto:** en el formulario, cada movimiento dispara `updateFieldStyles` y vuelve a renderizar
  el lienzo y los dos paneles, además de la comparación profunda del historial. En el PDF dispara
  `updateCellStyle` y vuelve a renderizar todas las celdas (ver A4).
- **Solución:** limitar las escrituras con `requestAnimationFrame` dentro de `ColorPickerField`:
  último color en un ref, como máximo una escritura por cuadro, vaciado al cerrar o desmontar. La
  vista previa en vivo se conserva; el input hexadecimal no cambia.

> **Medido el 2026-11-22: el costo es real, pero esta solución no sirve.** Arrastre de 60 pasos
> sobre el selector en Chrome (DevTools protocol, `vite preview`), CPU del hilo principal por cada
> paso que se pinta, con la CPU normal y frenada como el "slowdown" de DevTools:
>
> | Paso de color        | CPU ×1  | CPU ×4                           | CPU ×6              |
> | -------------------- | ------- | -------------------------------- | ------------------- |
> | Formulario (Fondo)   | 11,7 ms | 62,6 ms (16 pasos/s, entrecorta) | 102 ms (10 pasos/s) |
> | PDF (Color de celda) | 7,8 ms  | 35,6 ms                          | 61 ms (17 pasos/s)  |
>
> `react-colorful` 5.8.1 no agrupa nada (sin `requestAnimationFrame`): cada `mousemove` es una
> escritura. Pero el navegador ya entrega los `mousemove` como mucho uno por cuadro (Chrome lo
> documenta), así que "una escritura por cuadro" no baja la cantidad de escrituras: lo caro es
> **cada escritura** (todo el lienzo y los paneles se repintan). Opciones, **pendiente de decisión
> del usuario**: escribir solo al soltar (sin vista previa en el lienzo mientras se arrastra),
> escribir cada ~100 ms y al soltar (vista previa a saltos), o atacar la causa con A6 + O1 / A4
> (repintar menos en cada escritura).
>
> **Escribir también cuesta lo mismo:** cada tecla en Etiqueta mide **12,6 ms** (CPU ×1) y
> **67,7 ms** (CPU ×4). El costo no es del selector de color sino de cualquier escritura al store,
> así que O1 deja de ser "barato" (ver la tabla de oportunidades). Medido en Chrome headless con
> render por software: confirmar con el Profiler en una máquina real antes de decidir.

### [ ] A4 · MEDIA · El lienzo del PDF repinta y vuelve a sanear todas las celdas en cada tecla, zoom o clic

- **Dónde:** `components/organisms/pdf/PdfCanvas/PdfCanvas.tsx:148, 188, 196`,
  `pdf/PdfSheetView`, `pdf/PdfTableView/PdfTableView.tsx:25, 32, 69, 83`.
- **Causa:** no hay memoización. `PdfCanvas` se vuelve a renderizar con cada cambio de `design`,
  `zoom`, `selection` y `tool`. En cada render, `PdfTableView` vuelve a llamar a `sanitizePdfHtml`
  en cada celda HTML o de componente, y a `cellStyleMap` en **cada** celda. `onSelectCell` y
  `onActivate` son flechas nuevas en cada render, y `selectedIds` es un `Set` nuevo con cada cambio
  del diseño.
- **Impacto:** cientos de celdas por render en el ICA. El zoom con rueda y la escritura en una
  celda recorren todo el árbol. Las plantillas reales con base64 grande multiplican el costo.
- **Solución:** el store del PDF **ya comparte estructura** (`lib/pdfDesignEdit`), así que memoizar
  sirve: `PdfTableView` con `React.memo` (la recursión usa la versión memoizada), `onSelectCell`
  estable en `PdfCanvas` y `selectedIds` estable (conservar el `Set` si tiene los mismos ids).

### [x] ~~A5 · MEDIA (integridad) · El guardado del borrador falla en silencio si se llena `localStorage`~~ (2026-11-22, «Avisa cuando no se puede guardar el borrador»)

> **Hecho.** Eran **cuatro** llamadas, no tres: también abrir un archivo exportado
> (`useProjectImport`), que además dejaba el modal abierto. Las cuatro pasan por
> `lib/draftSave` → `saveDraftOrWarn` (decisión del usuario: aviso en cada intento fallido, mismo
> toast reemplazado). Reproducido en Chrome con el almacenamiento lleno (excepción silenciosa en
> los cuatro caminos) y corregido; controles con espacio sin cambios.

- **Dónde:** `lib/persistence/persistence.ts:24` (`saveDraft`), con llamadas desde
  `hooks/useAutosave/useAutosave.ts:17`, `hooks/useSaveButton/useSaveButton.ts:17` y
  `hooks/useKeyboardShortcuts/useKeyboardShortcuts.ts:87`.
- **Causa:** `localStorage.setItem` sin `try/catch`. El banco del PDF sí maneja la cuota
  (`savePdfDesign`) y comparte la misma cuota del origen; los diseños con base64 pueden llenarla.
- **Impacto:** la excepción sale del intervalo o del manejador: no se llama a `markSaved` y no se
  avisa nada. El usuario cree que guardó y puede perder trabajo al recargar.
- **Solución:** que `saveDraft` devuelva un resultado (`ok` o error), como `savePdfDesign`. Los tres
  sitios marcan "Guardado" solo si salió bien; si no, un toast de error con `id` fijo.

### [ ] A6 · MEDIA-BAJA (estructural) · Las ediciones del formulario no comparten estructura

- **Dónde:** `store/formStore.utils.ts:164` (`mapFieldEverywhere`) y `:238` (`mapRowEverywhere`).
- **Causa:** crean objetos nuevos para **todos** los pasos y **todas** las filas de los dos lienzos
  aunque solo cambie un campo. Una edición que no cambia nada también devuelve un estado nuevo.
- **Impacto:** contradice "Edits that change nothing must return the same reference" de
  `CLAUDE.md` (el historial queda a salvo porque `sameDocument` compara en profundidad, pero hay
  re-renders sin cambios reales); `getActiveRows` y los selectores de filas cambian siempre de
  referencia, así que ningún memo del lienzo podría funcionar (bloquea O1).
- **Solución:** reescribir los dos helpers con el patrón de `lib/pdfDesignEdit` y, en
  `updateField`/`updateFieldStyles`, devolver `state` si el parche no cambia nada.
  `removeFieldsEverywhere` queda como está.

---

## B. Bugs y riesgos de prioridad baja

| #      | Dónde                                                                                               | Causa → impacto                                                                                                                                                        | Solución                                                                               |
| ------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [ ] B1 | `hooks/useJsonCode/useJsonCode.ts:28`                                                               | Lo plegado se guarda por **índice de línea** y no se reajusta cuando el JSON cambia: tras agregar o quitar líneas, un bloque plegado puede quedar sobre **otro nodo**. | Vaciar `collapsed` cuando cambia el número de líneas del modelo.                       |
| [ ] B2 | `hooks/useFormPreview/useFormPreview.ts:119` + `lib/runtimeValidation/runtimeValidation.utils.ts:7` | Los errores revelados usan la llave `grupo:índice:campo` y `removeGroupItem` no los reindexa: una repetición nunca validada puede heredar errores en rojo.             | En `removeGroupItem`, correr las llaves de `revealed` de ese grupo.                    |
| [ ] B3 | `hooks/usePdfFile/usePdfFile.ts:34`                                                                 | Durante los 5 s de subida se puede usar "Abrir…": al responder, `markPublished` pisa la versión del archivo recién abierto.                                            | Deshabilitar "Abrir…" mientras `isUploading`.                                          |
| [ ] B4 | `atoms/CopyIconButton:18`, `JsonPreviewCanvas:20`, `usePayloadPreviewCanvas:47`                     | `navigator.clipboard.writeText` sin manejo de error: rechazo no manejado y el botón no avisa.                                                                          | `try/catch` con un toast de error.                                                     |
| [ ] B5 | `lib/scriptRuntime/scriptRuntime.utils.ts:12`                                                       | Las cachés de compilación (`CACHE`, `ERRORS`) no tienen tope.                                                                                                          | Tope como `VERTICAL_TEXT_CACHE_LIMIT`, también para la caché de A2.                    |
| [ ] B6 | `store/formStore.ts:283, 307` + `lib/exportForm/exportForm.ts:34`                                   | `setupConfig.hasIntroModal` e `introModalSteps` duplican `introModal.steps.length` y se sincronizan a mano.                                                            | Leer `introModal.steps.length > 0` donde se usa. **No cambiar la forma del borrador.** |
| [ ] B7 | `hooks/useFormPreview/useFormPreview.ts:52`                                                         | `hoy` se fija con `new Date()` dentro de un `useMemo`: pasada la medianoche con el simulador abierto, la mora usa el día anterior.                                     | Aceptar (muy raro) o recalcularlo al reiniciar.                                        |

---

## C. Oportunidades (solo si el Profiler lo justifica)

| #      | Dónde                                                                                | Qué pasa                                                                                                                                                                                  | Cuándo vale la pena                                                                                  |
| ------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [ ] O1 | `Canvas` → `CanvasRowsGrid` → `CanvasRow` → `CanvasFieldChip`                        | Cada tecla, cambio de selección o paso de zoom vuelve a renderizar todas las filas y chips del paso. **Medido 2026-11-22: no es barato**, 12,6 ms por tecla (67,7 ms con CPU ×4), ver A3. | Requiere A6 y callbacks estables. Candidato a subir de prioridad: pendiente de decisión del usuario. |
| [ ] O2 | `FormBuilder` (usa `useDragAndDrop`)                                                 | Al empezar y al terminar cada arrastre, y al pasar sobre una pestaña de paso, se vuelve a renderizar la app entera.                                                                       | Si se nota un tirón al empezar a arrastrar.                                                          |
| [ ] O3 | `ActiveStepLabel`, `RightSidebar`, `CanvasTabs`, `StepTitleEditor`, `FormSummary`    | Se suscriben a `formSteps` entero para datos chicos y se renderizan en cada tecla.                                                                                                        | Junto con O1: selectores de valores primitivos.                                                      |
| [ ] O4 | `JsonPreviewCanvas`                                                                  | Con la vista JSON abierta, cada tecla reconstruye el export y tokeniza ~2.200 líneas.                                                                                                     | Si se siente lento: `useDeferredValue(json)`.                                                        |
| [ ] O5 | `preview/PreviewResults:15-24`                                                       | Arma los JSON de las dos pestañas en cada tecla, aunque solo se ve una.                                                                                                                   | Barato: solo el de la pestaña activa.                                                                |
| [ ] O6 | `useClickOutside`, `useModalKeyGuard`, `useFieldContextMenu`, `useSimpleCalcBuilder` | Vuelven a registrar sus listeners en cada render del padre (callbacks nuevos). Inofensivo.                                                                                                | Limpieza con `useEffectEvent` (React 19.2).                                                          |
| [ ] O7 | `pdf/PdfThumbnail`                                                                   | Al volver a Proyecto relee el diseño guardado (`JSON.parse` + Zod) solo para la llave de la caché.                                                                                        | Si el diseño pesa mucho: llave a partir del texto crudo.                                             |

---

## D. Verificado como correcto (no tocar)

- No hay bucles de render. Todo `setState` dentro de un efecto está protegido: `reconcileState`
  devuelve el mismo objeto, `contentHeight`, `setRange` y `setOverflow` comparan antes,
  `pendingReveal` se consume una sola vez y `useSaveButton` usa un ref del valor anterior.
- No hay suscripciones sin selector. Los selectores con lógica devuelven objetos existentes o
  centinelas (`NO_ROWS`, `NO_SELECTION`).
- Las escrituras de alta frecuencia están bien resueltas: el arrastre guarda en refs y compara antes
  de escribir; el marco de selección usa `sameIdSet` y su rectángulo vive en `CanvasToolLayer`; el
  zoom por rueda se agrupa por cuadro en bajo rendimiento; el historial agrupa ráfagas.
- `ScriptEditor`, `useRichTextEditor`, `PreviewNumberInput` y `FieldNameInput` (con `key` por
  campo) manejan bien su estado local.
- Las subidas leen el store con `getState()` después de esperar y guardan el "en curso" en el store.
- Las llaves por índice de `CatalogFillsEditor` y `PdfSignaturesFields` son seguras.
- Vista JSON virtualizada, scripts con caché, `Tooltip` con `autoUpdate` solo abierto, StrictMode.

---

## Plan de corrección

Una corrección a la vez, en orden, con su verificación y su commit. No se pasa de fase sin terminar
y verificar la anterior. Cada corrección deja su nota en `docs/Decisiones.md`.

**Fase 1: bugs y arreglos baratos sin riesgo**

- [x] ~~A1 `onDragCancel`.~~ (2026-11-21)
- [x] ~~A2 caché de schemas.~~ (2026-11-21, medido: 0,08 ms por tecla, no se hace)
- [x] ~~A3 escritura del color limitada a una por cuadro.~~ (2026-11-22) Medido: el costo es real
      pero es el de **cualquier** escritura al store, no del color. Decisión del usuario: sin parche;
      se ataca la causa en la Fase 2.
- [x] ~~A5 resultado de `saveDraft` y toast.~~ (2026-11-22)
- [ ] B4 manejo de error del portapapeles.

**Fase 2: rendimiento del PDF y estructura del store**

- [ ] Perfilar primero una tecla en Etiqueta y un paso de color (formulario y PDF): qué
      componentes se llevan los ~12 ms por escritura. Con eso se ordena lo que sigue.
- [ ] A4 memo de `PdfTableView` + `onSelectCell` y `selectedIds` estables.
- [ ] A6 helpers que comparten estructura + O1 (memo de filas y chips del lienzo), si el perfil lo
      confirma: arreglan a la vez escribir y arrastrar el color (A3).
- [ ] B1, B2 y B3.

**Fase 3: solo con evidencia del Profiler**

- [ ] B5, B6, O1 a O7, según la medición.

## Verificación

- `pnpm build` y `pnpm lint` después de cada paso; grep en `dist/` para las fronteras perezosas.
- Pruebas en el navegador manejado por el protocolo de DevTools (Chrome headless con
  `--remote-debugging-port`, contra `vite preview` en otro puerto, nunca contra el servidor de
  desarrollo del usuario): reproducir el bug **antes** del cambio y confirmarlo **después**, con
  casos de control para lo que no debe cambiar.
- Scripts desechables con `pnpm exec tsx` para la lógica pura (A2, A6).
- React DevTools Profiler antes y después de A2, A4 y A6 para decidir la Fase 3.
- Pendiente del usuario: probar en Zen.
