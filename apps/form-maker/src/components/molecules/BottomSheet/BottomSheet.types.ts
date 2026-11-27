import type { ReactNode } from 'react'

// Asoma (un vistazo), media (lo comun) o completa (editores largos).
export type BottomSheetSize = 'peek' | 'half' | 'full'

export interface BottomSheetProps {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  // Escape, el fondo oscuro y la X la cierran.
  onClose: () => void
  size?: BottomSheetSize
}
