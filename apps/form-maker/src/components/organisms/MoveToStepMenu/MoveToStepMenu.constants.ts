import { ENTER_POP_CLASSES } from '../../../constants'
import type { MoveToStepMenuPlacement } from './MoveToStepMenu.types'

const MENU_BASE_CLASSES: string = `absolute flex max-h-72 w-60 flex-col overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg dark:bg-surface-raised ${ENTER_POP_CLASSES}`

// up: la barra flotante esta pegada al borde inferior. down: la fila y el menu del campo, arriba de
// lo que mueven.
export const MENU_CLASSES: Record<MoveToStepMenuPlacement, string> = {
  up: `${MENU_BASE_CLASSES} bottom-full left-1/2 mb-2 origin-bottom -translate-x-1/2`,
  down: `${MENU_BASE_CLASSES} right-0 top-full z-20 mt-1 origin-top-right`,
}

export const MENU_CAPTION_CLASSES: string =
  'px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-fg-muted'

export const MENU_ITEM_CLASSES: string =
  'flex items-center gap-2 px-2.5 py-1.5 text-left text-xs text-fg-soft transition-colors hover:cursor-pointer hover:bg-surface-raised dark:hover:bg-surface-inset'

export const MENU_NUMBER_CLASSES: string =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-raised text-[10px] font-semibold tabular-nums text-fg-muted dark:bg-surface-inset'
