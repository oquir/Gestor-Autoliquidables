# CLAUDE.md

Guidance for Claude Code in this app (FormMaker, formerly "Form Orchestrator"): a visual drag-and-drop **step-by-step form builder** that compiles its config to one JSON document, plus a **simulator** (a working prototype of the consuming app that runs the exported JSON) and a **PDF designer**.

**This file is the short version.** The full record of settled decisions, with their reasons, is [`docs/Decisiones.md`](docs/Decisiones.md) (the former CLAUDE.md, verbatim). **Before touching an area in the table below, read its section there** — headings are quoted exactly so you can grep them. Don't re-litigate what's marked "Settled" without asking the user.

## Other docs

- `docs/Project.md` (Spanish) — original spec, reference for the target JSON schema. Check before adding features.
- `docs/Dominio-ICA.md` — **read before working on the `industria_comercio`, `retencion_industria_comercio` or `autorretencion` templates, renglones, scripts, sanctions or deadlines.** ⏳ marks data that expires (UVT, bases, deadlines, rates): re-verify only those.
- `docs/Pendientes-PDF.md` — **read before any work on a declaration's PDF** ("Diseñar PDF", its templates, the `{Variable}` placeholders). Tick items off there as they land (`[x]`, strikethrough, date, commit).
- `docs/Plan-Movil.md` (Spanish) — the plan for phones and tablets (written 2026-11-26, built 2026-11-27): base, simulator, builder on tablet (touch grid), builder on phone (list view), PDF designer, measurements. Every item carries its date, commit and what was found. **Read before any responsive, touch or mobile work**; the settled rules are in `Phones and tablets` in `docs/Decisiones.md`.
- `docs/Auditoria-React.md` (Spanish) — the 2026-11-21 React render/state audit: prioritized findings (A real problems, B low, O opportunities to do only with Profiler evidence) and its three-phase fix plan. Read before touching re-renders, store helpers or any item it lists; tick items there.

## Where to read (section in `docs/Decisiones.md`)

| Area                                                                                     | Section                                                                    |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Right panel, collapsed chip, tabs, zoom control                                          | `The right panel (RightSidebar)`                                           |
| PDF preview image at the bottom of Proyecto (`PdfPreviewBlock`, `lib/pdfThumbnail`)      | `The right panel (RightSidebar)` → `The PDF preview`                       |
| Crash screens                                                                            | `Render errors (ErrorBoundary)`                                            |
| Hidden steps                                                                             | `Hidden steps (step.hidden)`                                               |
| Ctrl+←/→                                                                                 | `Step navigation shortcut`                                                 |
| Shift / Shift+Ctrl placement while dragging, `colStart`                                  | `Zone placement`                                                           |
| Canvas zoom, free canvas / pan room                                                      | `Canvas zoom`, `The free canvas`                                           |
| Slow-machine toggle                                                                      | `Low-performance mode`                                                     |
| JSON view, virtual list, its search                                                      | `JSON view: virtual list…`                                                 |
| Tools (V/M/H), floating bar, multi-selection                                             | `Canvas tools and floating toolbar`                                        |
| Undo/redo (zundo)                                                                        | `Undo / redo (zundo)`                                                      |
| Dragging rows, row styles                                                                | `Reordering rows`, `Row styles`                                            |
| `customCss` fields                                                                       | `Styles are plain CSS, not Tailwind classes`                               |
| Moving fields/rows between steps                                                         | `Moving things between steps` (Almacén de Partes is gone — do not rebuild) |
| `actividades[]`, `group.checks`                                                          | `Repeatable groups`, `group.checks`                                        |
| `logic.script`, `{{campo}}`, rules, prelude, no-code calc                                | `The field script`, `References are {{campo}}`, `No-code calculation`      |
| `label`, `rich_text`                                                                     | `Presentational fields`                                                    |
| Simulator, mock catalogs                                                                 | `Simulador (FormSimulator)`                                                |
| PDF designer                                                                             | `PDF designer (PdfDesigner)`                                               |
| tooltip, rounding, formatted, decimals, allowsNegative, maxLength, placeholder, datalist | the section named after each                                               |
| `apiBinding.kind: "concept"` / `conceptos`                                               | `Conceptos tributarios`                                                    |
| Options, `dataSource`, `fills`, catalog/fechas/UVT banks                                 | `Options and apiBinding` and its `###` subsections                         |
| Date helpers (`fechaLimite`, `mesesDeMora`…)                                             | `fechaLimite / diasDeMora / mesesDeMora`                                   |
| Renglón 31 / 37 (sanción, intereses)                                                     | `Sanciones`, `Intereses de mora`                                           |
| `validations.overrides`, `visibleWhen`/`enableWhen`                                      | `Conditional validations`, `Conditions`                                    |
| Open an exported file                                                                    | `Opening an exported form (builderDraft)`                                  |
| Export review                                                                            | `Export review (diagnoseForm)`                                             |
| Button hierarchy (primary/secondary/tertiary), action row, chip order                    | `Button hierarchy (actionTiers)`                                           |
| Subir (upload, fake request), toasts in the builder                                      | `Subir (upload to the API)`                                                |
| `projectMeta.requires`                                                                   | `What a form requires`                                                     |
| Pieces / persistence / output                                                            | `Architecture` → `Pieces`                                                  |
| Unit tests, `tests/`, the ICA golden                                                     | `Commands` → `Unit tests (Vitest)`                                         |
| Bugs and risks the tests found (to try by hand)                                          | `docs/Hallazgos-Pruebas.md`                                                |
| Phones, tablets, touch: layout modes, sheets, drawers, Android Back, pinch, measurements | `Phones and tablets` and its `###` subsections                             |

## Known gaps

- **The consumer (`FrontAutoliquidable`) has drifted from the builder silently**: it copied the runtime on 2026-08-26 and lacks `fieldDate`, `dateFormat`, `dateBound`, `fieldAffix`, `fieldContact` (and drops `datalist` suggestions). The ICA template already uses them. Plan: port the modules; the export already declares `projectMeta.requires`, the consumer must refuse forms asking for words it lacks (both go together). Sharing the runtime as a package is postponed by the user. `pnpm verify` in the consumer runs the real JSON through its runtime.
- **The consumer must copy the simulator's phone rules by hand** (none of them travel in the JSON; S8 of `docs/Plan-Movil.md`, 2026-11-27):
  - rows stack under 40rem of form width (container query, see `Simulador (FormSimulator)`);
  - inputs at 16 px with a touch pointer (Safari zooms on smaller ones);
  - options (`toggle_group` chips, checkbox/radio rows) 44 px tall with a touch pointer, the whole row tappable;
  - the Anterior/Siguiente bar sticky at the bottom on phones, with the safe area; moving to another step scrolls back to the top;
  - Enter's key labelled "next" on every text field and "done" on the last, Enter jumping to the next field (outside a `<form>` Android doesn't);
  - the intro modal fills the card on phones (not floating mid-page) with its button stuck at the bottom; on a touch tablet it sits at the top of the card, `sticky` and capped at the screen's height (the 44 px controls make step 1 taller than the screen);
  - the `search_select` list full screen in `dvh` on phones, so it shrinks with the keyboard;
  - Android Back closes the topmost open layer (list, modal) before leaving the form.
- **Phones and tablets are built** (`docs/Plan-Movil.md`, 2026-11-27): on a phone the form is edited as a list (`CanvasList`, each field in a sheet; the real grid stays as the read-only "Revisar" view), tablets keep the grid with touch gestures and drawers, and the simulator and the PDF designer work with a finger. Real testing is **Android only**; the iPhone is emulated, and its untested risks are listed in `Phones and tablets` → `Risks that stay`. Still open, the user's: polishing the look of the phone bars and sheets, and the NIT's numeric keyboard (on hold). The canvas squashing fields in proportion (the narrow DV) is accepted as is on desktop.
- **A required select left empty shows Zod's default English message** in the simulator ("Invalid input: expected string, received undefined"; seen 2026-11-27, not fixed). The consumer would show the same.
- **Unit tests (Vitest) cover the agreed scope** (all six batches landed 2026-11-24: number/date rules, the ICA golden, draft migrations, the whole engine from script to export review, each of the 17 palette types end to end in the three declarations, the per-field helpers, rows, groups, mapping, banks, editor utilities, the whole PDF designer, and the store actions with undo/redo). A new pure module or store action gets its test. Agreed scope: every pure `lib/` module, each field type end to end in the three declarations, the PDF designer and the store actions. **Never components, hooks or the canvas** (the user's call). What isn't covered yet: throwaway `pnpm exec tsx` scripts in the scratchpad.
- **A rule's script effect runs without the `RuntimeContext`** (found by the tests 2026-11-24, not fixed yet: waiting for the user). In `runtimeDerived.ts` the `runFieldScript` of `effect.script` gets no `context`, so inside a rule `uvt()`/`smmlv()` return `null` and `fechaLimite`/`diasDeMora`/`mesesDeMora` act as if no table were loaded. The field script and the group checks do get it. It is pinned by an `it.fails` in `runtimeDerived.test.ts`.
- `logic.script` exports **compiled JS**, run by the consumer with `new Function` — the trust boundary (a JSON from someone else = code execution).
- Zod validates _shape_, not coherence (`colSpan: -999`, a `dataSource` on a `text` field pass).
- `validations.pattern` isn't validated while typing; the export review blocks an invalid regex.
- **Renglón 31 hardcodes two catalog ids** (`TIPO_SANCION_OTRA = "4"`, `TIPO_SANCION_EXTEMPORANEIDAD = "1"`); reordering `tipos_sancion` breaks them silently.
- **Two selects still infer their catalog from the path** (`periodo_anio`, `clasificacion_contribuyente`); `juegos_permitidos` has no field. Catalog ids are unconfirmed contract names.
- Renglones 31 and 37 need the intro modal (`{{periodo_anio}}` lives there); deleting those intro steps leaves them uncalculated (the export review blocks).
- Selects mapped to `number` leaves show a permanent `⚠ tipo` (fix offered, not approved).
- PDF designer: §3.1, §3.2, §3.3, §3.5 built; no variable list (§3.4). §3.3 has no checkbox and no repeating row — the user's call, don't build them without asking. Styles go in design classes (one `<style>`, `class="…"` per cell); don't reintroduce per-cell inline defaults. The sidebar isn't checked in a browser yet, nor anything through the real back.

## Invariants that bite (details in `docs/Decisiones.md`)

- **Selectors must return stable references** (Zustand `useSyncExternalStore`): use the `NO_ROWS`/`NO_GROUPS`/`NO_SELECTION` sentinels, never a fresh `[]`.
- **A shape change needs a draft migration** (`persistence.migrations.ts`, bump `DRAFT_SCHEMA_VERSION`) — migrate _before_ validating. A purely additive optional key needs only its line in `persistence.schema.ts`: `z.object` silently strips undeclared keys. Same for `pdfDesignBank.schema.ts`.
- **The simulator consumes `buildFormExport(...)` and never `useFormStore`.** If it can't do something, neither can the consumer.
- **Lazy boundaries**: `FormSimulator`, `PdfDesigner`, `ScriptEditor`, `PdfThumbnail` are separate chunks. Don't re-export them from level `index.ts`; don't import `lib/mockCatalog`, `zodHydrate`, `formRuntime`, `scriptRuntime`, `runtimeValidation`, `components/organisms/preview|pdf` etc. from the builder side. Verify with `pnpm check:chunks`; a new boundary goes in its lists.
- **Field refs are `{{campo}}`**; `fieldRefText(name)` is the one place that writes the syntax. An unknown `{{x}}` is an error. Never move rule logic (sanción, intereses) out of `logic.script` into code or the prelude.
- **Never in the draft or export**: the simulator banks (catalogs, fechas, UVT), the PDF design (own `localStorage` key per tax), `canvasZoom`, `canvasTool`, panel state.
- **Never store rich text/PDF HTML as raw HTML**; the serializer/sanitizer is the barrier, `safeHref` runs at insert, serialize and draft load.
- **The `DndContext` needs `onDragCancel` → `resetDragState`**: dnd-kit cancels on Escape, `pointercancel`, tab switch and resize and then never calls `onDragEnd`; without it the drag state and the window listeners survive the drag.
- **dnd-kit consumers are thin shells over a memoized body** (`CanvasFieldChip`, `CanvasRow` → `RowToolbar`, `PaletteChip`, `StepTabChip`): `useDraggable`/`useDroppable` re-render past any `memo` on every drag state change. Keep `POINTER_SENSOR_OPTIONS` a module constant and the chips' handlers stable (`useCallback`), or every body repaints again.
- **Save the draft through `saveDraftOrWarn`** (`lib/draftSave`), never `saveDraft` + `markSaved` by hand: `saveDraft` returns ok/error (full `localStorage`), and only `saveDraftOrWarn` marks "Guardado" or shows the error toast.
- **Equality for undo is `sameDocument`** — selection, zoom, tool and drag state never create a history step. Edits that change nothing must return the same reference: `mapFieldEverywhere`/`mapRowEverywhere` keep every untouched step and row, so an updater must return the **same** object when nothing changes (`patchChanges`).
- **Rounding/negatives/decimals change the value, not just display**; the formatted text never leaves the input (state holds a real `number`).
- Nothing in the collapsed right chip's container, nor in a `SideDrawer`/`BottomSheet` that opens panels, may keep `transform`/`filter`/`backdrop-filter`/`will-change`/`container-type` (breaks `ModalShell`, measured against it). That's why the floating bar's `@container` lives in its own layer inside `CanvasToolbar`, and a drawer's entry animation must end without a transform.
- **Width and pointer are two independent axes.** Layout comes from `useLayoutMode()` (`phone` < 640, `compact` 640–1279, `desktop` ≥ 1280; view state, never in the draft); interaction from `pointer-coarse:` / `TOUCH_POINTER_QUERY`. Never infer touch from width (a 1280 tablet is `desktop` with a finger). **The desktop must not change**: new mobile work goes behind the mode or `max-sm:`/`pointer-coarse:` (`sm:pointer-coarse:` for touch tablets only).
- **Every layer that opens over the screen closes with Android Back** through `useBackClose` (simulator, designer, sheets, drawers, `ModalShell`); never call `history.back()`/`pushState` by hand. What opens over a button goes through `MenuSurface` (a sheet on the phone) with its own `useClickOutside` off there.
- **`touch-action` belongs to each surface**: canvas ports `touch-pan-x touch-pan-y` (pinch in `usePinchZoom`, passive listeners only), drag handles `touch-none`, the PDF's select tool `touch-action: none`. Touch drags go through `TouchSensor` (`TOUCH_SENSOR_OPTIONS`, module constant); `MousePenSensor` ignores fingers.
- **Tap areas grow with `touch-target`, not with a new size** (an `::after` at `z-index: -1`); inputs are 16 px with `pointer-coarse:text-base`. Saving also runs on `usePageHide`: the phone kills background tabs without `beforeunload`.
- **Action buttons take their look from `constants/actionTiers`** (`ACTION_TIER_CLASSES`): primary / secondary / tertiary / quiet. The only filled orange is Subir; don't hand-write a new border or fill for a button.
- Every UI hint uses `atoms/Tooltip`, never native `title=` (handles dnd-kit owns are the exception). Every new surface needs `dark:` variants.

## Commit conventions

- Spanish, present tense, imperative ("Agrega X", "Corrige Y"). Subject under ~72 chars. **Bodies short — 3-4 lines max, often none**; durable detail goes to docs, not commit history.
- One commit per cohesive change. **Stage by explicit path** — never `git add -A`/`git add src` (unrelated WIP is common).
- `.gitattributes` normalizes to LF; if `git status` isn't clean, `git add --renormalize .` once, separately.
- On Windows write the message to a file and use `git commit -F <file>`.

## Commands

Package manager is **pnpm** (never npm/yarn/bun).

- **A dependency only the lazy chunks import goes in `optimizeDeps.include`** (`vite.config.ts`: `@codemirror/*`, `@lezer/highlight`; `sonner` left it when the builder started using it). Without it, the first open of the Lógica tab failed in dev with "Failed to fetch dynamically imported module" (504 Outdated Optimize Dep). **Never run `vite --force` while a dev server is up**: it deletes `node_modules/.vite` before binding the port, under the live server.

- `pnpm dev` / `pnpm build` (typecheck `tsc -b` + build; may exceed the 2-min tool timeout, exit 143 = harness kill, re-run longer) / `pnpm lint` / `pnpm format` / `pnpm preview`
- `pnpm test` / `pnpm test:watch` — Vitest (`vitest.config.ts`, apart from `vite.config.ts`), `node` environment, no DOM. **Tests live in `tests/`, never inside `src/`** (the user's call): `tests/lib/<x>.test.ts`, later `tests/store/…`. They import from `../../src/...`, and `tsconfig.app.json` includes `tests`, so `tsc -b` checks them. Shared helpers are in `tests/helpers/` (`canvasFixtures`: small forms without the store, ids `id-<name>`; `runtimeHarness`: factory ICA, runtime context with a fixed `hoy`; `memoryStorage`: `localStorage` with a quota; `storeHarness`: fake clock for undo, **started before the dynamic import of the store**); the app never imports them. A known bug is pinned with `it.fails` plus a `BUG:` comment. **Property tests** (`tests/lib/<x>.props.test.ts`, `fast-check`) sit next to the example tests, never instead of them; a new failure there is a finding (replay it with the printed `seed`/`path`), not a flake. Find fields and groups **by name**, never by uuid. Close each batch by breaking a rule on purpose and seeing the right test fail. Details: `Unit tests (Vitest)` in `docs/Decisiones.md`.
- `pnpm check:chunks` — `scripts/checkChunks.ts`: builds in memory (`write: false`, leaves `dist/` and a running dev server alone, no typecheck, ~12 s) and fails if a lazy-only module lands in the initial load or one of the four lazy parts stops being its own chunk; names the builder file that made the import and prints chunk sizes. Not part of `pnpm test`.
- `pnpm exec tsx <script>.ts` — throwaway verification. **Run from the project root**, never from inside the scratchpad (pnpm 11 would try to `pnpm install` over the junctioned `node_modules`). Scratchpad needs `package.json` `{"type":"module"}`, absolute imports as `file:///C:/...`, a `node_modules` junction, and a `localStorage` stub installed _before_ a dynamic `import()` of the store.
- ESLint + Prettier are shared with the dashboard at the monorepo root (2 spaces, single quotes, no semicolons, 100 cols). `reicon-react` is pinned to exact `1.1.2`. `pnpm-workspace.yaml` carries `allowBuilds`.

## File layout conventions

- Atomic design: `src/components/atoms|molecules|organisms/` + `layout/`; panels in `organisms/panels/`. Each component/hook gets **its own folder** with co-located `X.tsx`/`X.types.ts`/`X.constants.ts`/`X.utils.ts` (only what's needed) and an `index.ts` (`export * from './X'`). Hooks `src/hooks/useX/useX.ts`; libs `src/lib/<name>/<name>.ts`.
- Import a component by its folder; across levels go through the level `index.ts`, **within a level import by folder, never the level index** (cycle). No upward imports (atom → molecule).
- `hooks/`, `constants/`, `types/`, `lib/`, `store/` have an `index.ts` too; code outside imports through it. **Left out of the indices on purpose** (imported by folder, from behind the lazy boundary): `useFormPreview`, `usePreviewNavigation`, `usePreviewSearchSelect`, `usePdfDesignAutosave`, `usePdfDesignerShortcuts`, `usePdfFile`, `usePdfImageCheck`, `usePdfImport`, `usePdfOverflowToast`; libs `catalogFill`, `formRuntime`, `mockCatalog`, `pdf*`, `runtimeCondition|Derived|Payload|Validation`, `scriptDates`, `scriptRuntime`, `scriptValores`, `zodHydrate`; `store/pdfDesignStore.ts`, `banksSlice`. Libs import each other by folder, never through `lib/index.ts`.
- A co-located `X.types.ts`/`X.constants.ts` is private to its folder; once something outside imports it, it moves to `src/types/` / `src/constants/` (whole file, not split). A new file there needs its line in the index.
- `X.ts` is the module's public API — helpers/constants/types go in co-located files.

## Stack

`@dnd-kit/core` + `sortable`, `zustand` + `zundo` (undo/redo), `zod` (schemas authored per field, stored as strings), `react-hook-form` (unused so far), Tailwind v4 (class-based dark mode), `uuid`, `reicon-react` (not lucide/heroicons), `@floating-ui/react` `0.27.20` (UI tooltips only — not `field.tooltip`), `@codemirror/*` (script editor, lazy), `tw-animate-css` (entry animations, composed in `constants/animations.ts`; not inside the PDF canvas's shadow root).

## Code style

- **Comments in Spanish, `//` only — never JSDoc**, no accents. `src/lib/`, `src/store/`, `src/hooks/` carry a header comment per file (role/boundary) plus comments only for traps, invariants or discarded alternatives; if deducible from the next line, don't write it. `src/components/` isn't commented by default.
- **Explicit type annotations** on local declarations. Prettier decides formatting (`pnpm format`).
