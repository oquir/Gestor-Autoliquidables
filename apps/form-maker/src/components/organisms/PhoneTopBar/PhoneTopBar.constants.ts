// Barra de arriba del celular (P1 de docs/Plan-Movil.md): moverse de paso sin abrir nada, el paso
// activo como boton que abre la lista, y a la derecha el estado del guardado y Subir.
export const BAR_CLASSES: string =
  'flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2 py-1.5 dark:bg-surface-raised'

export const STEP_BUTTON_CLASSES: string =
  'press flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 text-left hover:cursor-pointer hover:bg-surface-raised dark:hover:bg-surface-inset'

export const STEP_NUMBER_CLASSES: string =
  'shrink-0 rounded bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-fg-muted dark:bg-surface-inset'

export const STEP_TITLE_CLASSES: string = 'truncate text-sm font-medium text-fg-strong'

export const ARROW_BUTTON_CLASSES: string =
  'flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:cursor-pointer hover:bg-surface-raised hover:text-fg-strong disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-surface-inset'
