// Barra de abajo del celular (P1 de docs/Plan-Movil.md): icono y texto, al alcance del pulgar.
// pb-safe: la barra de gestos de Android.
export const BAR_CLASSES: string =
  'flex shrink-0 items-stretch justify-around gap-1 border-t border-border bg-surface px-2 pt-1.5 pb-safe-2 dark:bg-surface-raised'

export const ITEM_CLASSES: string =
  'press flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[10px] font-medium hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40'

export const STRUCTURE_GRID_CLASSES: string =
  'mb-4 grid grid-cols-2 gap-2 border-b border-border pb-4'

export const STRUCTURE_BUTTON_CLASSES: string =
  'flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition-colors hover:border-brand-border hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40'

export const SELECTION_BAR_CLASSES: string =
  'flex shrink-0 items-center justify-between gap-2 border-t border-border bg-surface-subtle px-3 py-1.5 dark:bg-surface'

export const SELECTION_COUNT_CLASSES: string = 'text-xs font-semibold tabular-nums text-fg-strong'

export const SELECTION_ACTIONS_CLASSES: string = 'flex items-center gap-1.5'

export const SELECTION_ACTION_CLASSES: string =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg transition-colors hover:border-brand-border hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40'

export const SELECTION_DANGER_CLASSES: string =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-surface text-danger transition-colors hover:bg-danger-soft/40'

export const SELECTION_CLOSE_CLASSES: string =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg-strong'
