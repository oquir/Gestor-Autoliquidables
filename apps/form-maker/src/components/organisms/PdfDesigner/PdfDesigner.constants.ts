import { ACTION_TIER_CLASSES } from '../../../constants'
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

export const OPEN_BUTTON_CLASSES: string = ACTION_TIER_CLASSES.tertiary.regular

// Con borde y separado del titulo por una raya (el usuario, 2026-11-21): sin borde se leia como parte
// del titulo.
export const BACK_BUTTON_CLASSES: string = ACTION_TIER_CLASSES.secondary.regular

export const BACK_DIVIDER_CLASSES: string = 'h-8 w-px shrink-0 bg-border'

export const THEME_BUTTON_CLASSES: string = ACTION_TIER_CLASSES.quiet.icon
