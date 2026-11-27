import type { ReactNode } from 'react'

export type SideDrawerSide = 'left' | 'right'

export interface SideDrawerProps {
  // Nombre del dialogo para el lector de pantalla: el cajon no trae titulo propio, lo pone el panel
  // que lleva adentro.
  label: string
  children: ReactNode
  // Escape y el fondo oscuro lo cierran.
  onClose: () => void
  side?: SideDrawerSide
}
