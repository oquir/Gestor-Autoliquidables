import { ENTER_FADE_CLASSES, ENTER_SHEET_CLASSES } from '../../../constants'
import type { BottomSheetSize } from './BottomSheet.types'

export const LAYER_CLASSES: string = 'fixed inset-0 z-50 flex flex-col justify-end'

export const BACKDROP_CLASSES: string = `absolute inset-0 bg-black/60 ${ENTER_FADE_CLASSES}`

// relative: queda encima del fondo, que va antes en el DOM. sm:max-w-lg por si se abre en algo mas
// ancho que un celular: no se estira de borde a borde.
export const PANEL_CLASSES: string = `relative flex max-h-dvh w-full flex-col overflow-hidden rounded-t-2xl border-t border-border bg-surface text-fg shadow-2xl outline-none sm:mx-auto sm:max-w-lg ${ENTER_SHEET_CLASSES}`

// En dvh: con el teclado abierto (interactive-widget=resizes-content) la hoja se achica con la
// pantalla en vez de quedar tapada.
export const SIZE_CLASSES: Record<BottomSheetSize, string> = {
  peek: 'h-[30dvh]',
  half: 'h-[55dvh]',
  full: 'h-[calc(100dvh-1rem)]',
}

export const HEADER_CLASSES: string =
  'flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 pt-4 pb-3'

export const TITLE_CLASSES: string = 'text-base font-semibold leading-snug text-fg-strong'

export const DESCRIPTION_CLASSES: string = 'mt-0.5 text-sm text-fg-muted'

export const CLOSE_BUTTON_CLASSES: string =
  '-mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:cursor-pointer hover:bg-surface-raised hover:text-fg-strong'

// last: sin pie, el cuerpo toca el borde de abajo y se aparta de la barra de gestos.
export const BODY_CLASSES: string = 'min-h-0 flex-1 overflow-y-auto px-4 py-4 last:pb-safe-4'

export const FOOTER_CLASSES: string =
  'shrink-0 border-t border-border bg-surface-sunken px-4 pt-3 pb-safe-3'
