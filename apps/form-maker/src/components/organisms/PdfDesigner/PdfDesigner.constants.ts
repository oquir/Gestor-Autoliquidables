import { ACTION_TIER_CLASSES, ENTER_POP_CLASSES } from '../../../constants'
import type { PdfPaperTone } from '../../../types'
import type { PdfSaveStatus } from './PdfDesigner.types'

export const STATUS_DOT_CLASSES: Record<PdfSaveStatus['tone'], string> = {
  saved: 'bg-success',
  error: 'bg-danger',
  idle: 'bg-fg-subtle',
}

// Va en el <main> que hace scroll: las hojas del shadow root quedan inertes y heredan el cursor.
export const HAND_CURSOR_CLASSES: string = 'cursor-grab select-none active:cursor-grabbing'

// La escala de la cabecera, de mayor a menor peso (constants/actionTiers.ts): Subir es el unico
// relleno, Descargar HTML y Volver secundarios, Abrir terciario y el modo oscuro solo icono.
export const UPLOAD_BUTTON_CLASSES: string = ACTION_TIER_CLASSES.primary.regular

export const DOWNLOAD_BUTTON_CLASSES: string = ACTION_TIER_CLASSES.secondary.regular

// Apagado mientras Subir espera: abrir otro archivo cambiaria la version que la respuesta marca.
export const OPEN_BUTTON_CLASSES: string = `${ACTION_TIER_CLASSES.tertiary.regular} disabled:cursor-wait disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-fg-muted dark:disabled:hover:bg-transparent`

// Con borde y separado del titulo por una raya (el usuario, 2026-11-21): sin borde se leia como parte
// del titulo.
export const BACK_BUTTON_CLASSES: string = ACTION_TIER_CLASSES.secondary.regular

export const BACK_DIVIDER_CLASSES: string = 'h-8 w-px shrink-0 bg-border'

export const THEME_BUTTON_CLASSES: string = ACTION_TIER_CLASSES.quiet.icon

export const COMPACT_BACK_CLASSES: string =
  'flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:cursor-pointer hover:bg-surface-raised hover:text-fg-strong dark:hover:bg-surface-inset'

export const COMPACT_MORE_CLASSES: string = COMPACT_BACK_CLASSES

export const COMPACT_MENU_CLASSES: string = `absolute right-0 top-full z-30 mt-1 flex w-64 origin-top-right flex-col rounded-md border border-border bg-surface py-1 shadow-lg dark:bg-surface-raised ${ENTER_POP_CLASSES}`

export const COMPACT_MENU_ITEM_CLASSES: string =
  'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-raised hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-surface-inset'

export const COMPACT_MENU_SECTION_CLASSES: string =
  'px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-muted'

export const COMPACT_PAPER_OPTIONS: {
  tone: PdfPaperTone
  label: string
  paper: string
  ink: string
}[] = [
  { tone: 'white', label: 'Papel blanco', paper: '#ffffff', ink: '#1f2937' },
  { tone: 'sepia', label: 'Papel sepia', paper: '#f4ecd8', ink: '#4a3f2a' },
  { tone: 'dark', label: 'Papel oscuro', paper: '#121212', ink: '#e5e5e5' },
]
