import { ACTION_BASE_CLASSES, ACTION_TIER_CLASSES, ACTION_SIZE_CLASSES } from '../../../constants'

// Terciario: se guarda solo cada tanto y con Ctrl+S. "Guardado" no es un boton nuevo sino el mismo en
// verde (el que ya pasaba contraste) y sin accion mientras dura el aviso.
const SAVED_CLASSES: string = `${ACTION_BASE_CLASSES} ${ACTION_SIZE_CLASSES.compact} text-emerald-700 hover:cursor-not-allowed dark:text-emerald-400`

export const SAVE_BUTTON_STATE_CLASSES: Record<'saved' | 'idle', string> = {
  saved: SAVED_CLASSES,
  idle: ACTION_TIER_CLASSES.tertiary.compact,
}

// En la fila del panel lleva el borde del secundario (el usuario, 2026-11-21), tambien en verde.
export const SAVE_BUTTON_BORDERED_STATE_CLASSES: Record<'saved' | 'idle', string> = {
  saved: `${SAVED_CLASSES} border border-border-strong`,
  idle: ACTION_TIER_CLASSES.secondary.compact,
}
