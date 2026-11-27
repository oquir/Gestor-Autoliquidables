export const TRIGGER_BASE_CLASSES: string =
  'flex w-full items-center justify-between gap-2 rounded-md border bg-field px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:cursor-pointer disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-fg-muted'

export const TRIGGER_IDLE_CLASSES: string = 'border-border hover:border-brand-border'

export const TRIGGER_INVALID_CLASSES: string = 'border-danger-soft'

// dvh y no vh: con el teclado abierto (interactive-widget=resizes-content) la lista se achica con la
// pantalla en vez de quedar tapada; en el escritorio valen lo mismo. En el celular, pantalla completa.
export const OVERLAY_CLASSES: string =
  'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 max-sm:p-0'

export const PANEL_CLASSES: string =
  'flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none max-sm:border-0'

export const FOOTER_CLASSES: string =
  'flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 py-3 max-sm:pb-safe-3'

export const SEARCH_INPUT_CLASSES: string =
  'w-full rounded-md border border-border bg-field py-2 pr-3 pl-9 text-sm text-fg outline-none pointer-coarse:text-base focus:border-brand-border'

export const OPTION_BUTTON_CLASSES: string =
  'flex w-full items-start justify-between gap-3 px-5 py-3 text-left transition-colors hover:cursor-pointer hover:bg-surface-raised'

export const TARIFA_BADGE_CLASSES: string =
  'shrink-0 rounded-full bg-warning-surface px-2 py-0.5 text-[11px] font-semibold text-warning'

export const TARIFA_MISSING_CLASSES: string =
  'shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-fg-subtle'

export const FOOTER_BUTTON_CLASSES: string =
  'rounded-md border border-border px-3 py-1.5 text-xs text-fg-soft transition-colors hover:cursor-pointer hover:bg-surface-raised'
