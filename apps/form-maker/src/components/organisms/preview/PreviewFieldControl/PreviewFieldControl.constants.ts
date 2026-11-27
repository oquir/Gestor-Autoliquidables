export const CONTROL_BASE_CLASSES: string =
  'w-full rounded-md border bg-field px-2.5 py-1.5 text-sm text-fg outline-none transition-colors pointer-coarse:text-base disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-fg-muted'

export const CONTROL_IDLE_CLASSES: string = 'border-border focus:border-brand-border'

export const CONTROL_INVALID_CLASSES: string = 'border-danger-soft focus:border-danger'
// En tactil las opciones crecen de verdad hasta 44 px (no con touch-target: el ::after de un chip
// pisaria al vecino, que esta a 6 px).
export const TOGGLE_GROUP_CLASSES: string = 'flex flex-wrap gap-1.5 pointer-coarse:gap-2'

export const CHIP_BASE_CLASSES: string =
  'rounded-md border px-2.5 py-1 text-xs transition-colors hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:px-3.5 pointer-coarse:text-sm'

export const CHIP_ACTIVE_CLASSES: string = 'border-brand-border bg-brand-surface text-brand-fg'

export const CHIP_IDLE_CLASSES: string = 'border-border bg-field text-fg-soft'

// La etiqueta envuelve la casilla: toda la fila se toca.
export const OPTION_ROW_CLASSES: string =
  'flex items-center gap-2 text-sm text-fg-soft hover:cursor-pointer pointer-coarse:min-h-11 pointer-coarse:gap-3 pointer-coarse:text-base'

export const OPTION_INPUT_CLASSES: string = 'shrink-0 accent-brand pointer-coarse:size-5'

export const STACKED_OPTIONS_CLASSES: string = 'flex flex-col gap-1'

// wrap: con opciones largas pasan a la siguiente linea en vez de desbordar.
export const INLINE_OPTIONS_CLASSES: string = 'flex flex-wrap items-center gap-x-4 gap-y-1'
