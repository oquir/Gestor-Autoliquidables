import type { ReactNode } from 'react'

export interface PanelBlockProps {
  title: string
  action?: ReactNode
  // Ocupa el alto que sobra en el panel (la vista previa del PDF).
  fill?: boolean
  children: ReactNode
}
