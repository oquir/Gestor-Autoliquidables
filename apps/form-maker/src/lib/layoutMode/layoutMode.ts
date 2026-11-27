import { LAYOUT_DESKTOP_MIN_WIDTH, LAYOUT_PHONE_MAX_WIDTH } from '../../constants'
import type { LayoutMode } from '../../types'

// Modo de layout por el ancho (pura). El ancho decide el layout; el puntero (pointer: coarse) decide
// la interaccion, y son independientes: una tablet de 1280 en horizontal es desktop con dedo.

export function layoutModeFor(width: number): LayoutMode {
  if (!Number.isFinite(width) || width < LAYOUT_PHONE_MAX_WIDTH) return 'phone'
  if (width < LAYOUT_DESKTOP_MIN_WIDTH) return 'compact'

  return 'desktop'
}
