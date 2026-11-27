import { ACTION_TIER_CLASSES } from '../../../constants'

export const TRIGGER_CLASSES: string =
  'flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:cursor-pointer hover:bg-surface-raised hover:text-fg-strong dark:hover:bg-surface-inset'

// Los botones de siempre (Guardar, Simulador, PDF, Exportar) con su logica y sus modales, a tamano
// de dedo: el contenedor los agranda. Solo hijos directos: Tooltip clona el boton sin envolverlo,
// y asi no toca los botones de un modal que se abra desde ellos.
export const ACTIONS_GRID_CLASSES: string =
  'grid grid-cols-2 gap-2 [&>button]:min-h-11 [&>button]:w-full [&>button]:justify-center [&>button]:text-sm'

export const OPEN_BUTTON_CLASSES: string = ACTION_TIER_CLASSES.tertiary.compact

export const SECTION_TITLE_CLASSES: string =
  'text-[11px] font-semibold uppercase tracking-wide text-fg-muted'

export const PREFERENCE_ROW_CLASSES: string =
  'flex min-h-11 items-center justify-between gap-3 text-sm text-fg'

// Alto fijo: la vista previa se mide con container-type: size y dentro de una hoja que hace scroll
// no tiene un alto de donde crecer.
export const PDF_PREVIEW_FRAME_CLASSES: string = 'flex h-96 flex-col'
