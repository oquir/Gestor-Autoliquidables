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

### [ ] A2 · MEDIA · El simulador rehidrata todos los schemas de Zod en cada tecla

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

### [ ] A3 · MEDIA · El selector de color escribe al store en cada movimiento del puntero

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

### [ ] A5 · MEDIA (integridad) · El guardado del borrador falla en silencio si se llena `localStorage`

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

| #      | Dónde                                                                                | Qué pasa                                                                                                                                   | Cuándo vale la pena                                                                  |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [ ] O1 | `Canvas` → `CanvasRowsGrid` → `CanvasRow` → `CanvasFieldChip`                        | Cada tecla, cambio de selección o paso de zoom vuelve a renderizar todas las filas y chips del paso. Con 8 a 20 campos por paso es barato. | Solo con retraso medido. Requiere A6 y callbacks estables. **No se recomienda hoy.** |
| [ ] O2 | `FormBuilder` (usa `useDragAndDrop`)                                                 | Al empezar y al terminar cada arrastre, y al pasar sobre una pestaña de paso, se vuelve a renderizar la app entera.                        | Si se nota un tirón al empezar a arrastrar.                                          |
| [ ] O3 | `ActiveStepLabel`, `RightSidebar`, `CanvasTabs`, `StepTitleEditor`, `FormSummary`    | Se suscriben a `formSteps` entero para datos chicos y se renderizan en cada tecla.                                                         | Junto con O1: selectores de valores primitivos.                                      |
| [ ] O4 | `JsonPreviewCanvas`                                                                  | Con la vista JSON abierta, cada tecla reconstruye el export y tokeniza ~2.200 líneas.                                                      | Si se siente lento: `useDeferredValue(json)`.                                        |
| [ ] O5 | `preview/PreviewResults:15-24`                                                       | Arma los JSON de las dos pestañas en cada tecla, aunque solo se ve una.                                                                    | Barato: solo el de la pestaña activa.                                                |
| [ ] O6 | `useClickOutside`, `useModalKeyGuard`, `useFieldContextMenu`, `useSimpleCalcBuilder` | Vuelven a registrar sus listeners en cada render del padre (callbacks nuevos). Inofensivo.                                                 | Limpieza con `useEffectEvent` (React 19.2).                                          |
| [ ] O7 | `pdf/PdfThumbnail`                                                                   | Al volver a Proyecto relee el diseño guardado (`JSON.parse` + Zod) solo para la llave de la caché.                                         | Si el diseño pesa mucho: llave a partir del texto crudo.                             |

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
- [ ] A2 caché de schemas.
- [ ] A3 escritura del color limitada a una por cuadro.
- [ ] A5 resultado de `saveDraft` y toast.
- [ ] B4 manejo de error del portapapeles.

**Fase 2: rendimiento del PDF y estructura del store**

- [ ] A4 memo de `PdfTableView` + `onSelectCell` y `selectedIds` estables.
- [ ] A6 helpers que comparten estructura.
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
