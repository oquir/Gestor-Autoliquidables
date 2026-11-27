import type { CanvasTarget } from '../../../types'

export type MoveToStepMenuPlacement = 'up' | 'down'

export interface MoveToStepMenuProps {
  onSelect: (target: CanvasTarget) => void
  tooltip?: string
  // Por defecto el de la barra flotante; la fila y el menu del campo traen el suyo.
  triggerClassName?: string
  // up: la barra flotante, pegada abajo. down: la barra de la fila y el menu del campo.
  placement?: MoveToStepMenuPlacement
  disabled?: boolean
  // Controlado: la barra de la fila lleva el abierto para que sus menus sean excluyentes. Sin estos,
  // el menu lleva el suyo.
  isOpen?: boolean
  onToggle?: () => void
  onClose?: () => void
}

export interface MoveTargetOption {
  target: CanvasTarget
  // El numero de la pestana, calculado antes de quitar el activo: el paso 3 sigue diciendo 3.
  number: number
  title: string
}

export interface MoveTargetSection {
  key: CanvasTarget['type']
  caption: string | null
  options: MoveTargetOption[]
}
