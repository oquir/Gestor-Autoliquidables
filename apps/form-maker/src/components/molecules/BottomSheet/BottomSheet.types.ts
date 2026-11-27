import type { ReactNode } from 'react'
import type { BottomSheetSize } from '../../../types'

export interface BottomSheetProps {
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  // Escape, el fondo oscuro y la X la cierran.
  onClose: () => void
  size?: BottomSheetSize
}
