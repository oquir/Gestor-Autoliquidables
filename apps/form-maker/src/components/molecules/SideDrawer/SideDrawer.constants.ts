import {
  ENTER_DRAWER_LEFT_CLASSES,
  ENTER_DRAWER_RIGHT_CLASSES,
  ENTER_FADE_CLASSES,
} from '../../../constants'
import type { SideDrawerSide } from './SideDrawer.types'

export const LAYER_CLASSES: string = 'fixed inset-0 z-50 flex'

export const BACKDROP_CLASSES: string = `absolute inset-0 bg-black/60 ${ENTER_FADE_CLASSES}`

// 320px como el panel de escritorio, sin pasar del 85% en una tablet angosta. relative: encima del
// fondo. TRAMPA: sin transform, filter ni container-type que sobrevivan (ver ENTER_DRAWER_*): los
// paneles de adentro abren ModalShell, que es fixed y se mediria contra el cajon.
export const PANEL_CLASSES: string =
  'relative flex h-dvh w-80 max-w-[85vw] flex-col overflow-y-auto bg-surface text-fg shadow-2xl outline-none pb-safe-0'

// Cada lado: su borde, su animacion y la zona segura de su orilla (la muesca en horizontal).
export const SIDE_CLASSES: Record<SideDrawerSide, string> = {
  left: `mr-auto border-r border-border pl-safe-0 ${ENTER_DRAWER_LEFT_CLASSES}`,
  right: `ml-auto border-l border-border pr-safe-0 ${ENTER_DRAWER_RIGHT_CLASSES}`,
}
