import type { Placement, UseInteractionsReturn } from '@floating-ui/react'
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from 'react'

export interface TooltipProps {
  content: ReactNode
  // Un solo elemento enfocable, para que el teclado tambien lo abra.
  children: ReactElement<Record<string, unknown>>
  placement?: Placement
  className?: string
  disabled?: boolean
  // Abre con un toque aunque sea un boton: para los que no hacen nada mas que mostrar el globo
  // (InfoHint). Sin el, en tactil solo abre lo que no es ni esta dentro de algo tocable.
  tapToOpen?: boolean
}

// Los manejadores que floating-ui pone en el hijo. En un objeto: una funcion suelta en useState se
// tomaria como actualizador.
export interface TooltipReferenceProps {
  get: UseInteractionsReturn['getReferenceProps']
}

export interface TooltipFloatingProps {
  reference: Element | null
  content: ReactNode
  placement: Placement
  className: string
  isEnabled: boolean
  tapToOpen: boolean
  onReferenceProps: Dispatch<SetStateAction<TooltipReferenceProps | null>>
}
