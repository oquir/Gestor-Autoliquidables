export const NAV_BUTTON_CLASSES: string =
  'press rounded-md border border-border px-3 py-1.5 text-xs font-medium text-fg-soft hover:cursor-pointer hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-40'

export const PRIMARY_BUTTON_CLASSES: string =
  'press rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-on-brand hover:cursor-pointer hover:bg-brand-hover'

// En el celular el pie queda pegado abajo mientras la tarjeta se ve; los -mx/-mb lo llevan al borde
// de la tarjeta para que lo que scrollea por detras no asome a los lados. El sticky se mide dentro
// del padding del scroll de FormSimulator (py-4): -bottom-4 lo baja hasta el borde de la pantalla.
export const NAV_FOOTER_CLASSES: string =
  'mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 max-sm:sticky max-sm:-bottom-4 max-sm:z-10 max-sm:-mx-6 max-sm:-mb-6 max-sm:gap-2 max-sm:rounded-b-lg max-sm:bg-surface max-sm:px-3 max-sm:pt-3 max-sm:pb-safe-3'

export const RESTART_BUTTON_CLASSES: string = `${NAV_BUTTON_CLASSES} max-sm:flex max-sm:items-center max-sm:px-2`

export const SUBMITTED_CLASSES: string = 'text-[11px] font-medium text-success'

// Fecha nativa, casillas y archivo no abren teclado; el tabindex -1 es el selector de fecha oculto.
export const TEXT_ENTRY_SELECTOR: string =
  'input:not([type="checkbox"], [type="radio"], [type="file"], [type="hidden"], [type="date"], [type="datetime-local"], [tabindex="-1"]):not(:disabled), textarea:not(:disabled)'
