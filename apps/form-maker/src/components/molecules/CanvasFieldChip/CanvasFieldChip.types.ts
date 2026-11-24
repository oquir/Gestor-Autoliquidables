import type { useDraggable } from '@dnd-kit/core'
import type { MouseEvent } from 'react'
import type { CanvasField } from '../../../types'

type DraggableHandle = ReturnType<typeof useDraggable>

// Adonde va el valor: una ruta de la API, excluido o sin decidir. Los presentacionales no llevan
// marca.
export type FieldDestination = 'sent' | 'internal' | 'pending' | 'none'

// Reciben el id del campo: la fila pasa los mismos dos manejadores a todos sus chips.
export type ChipMouseHandler = (event: MouseEvent<HTMLButtonElement>, fieldId: string) => void

export interface CanvasFieldChipProps {
  field: CanvasField
  rowId: string
  rowColumns: number
  rowFields: CanvasField[]
  linkedLabel: CanvasField | null
  selected: boolean
  // Cromo fijo: seleccion unica con la herramienta Mover.
  pinned: boolean
  onChipClick: ChipMouseHandler
  onChipContextMenu: ChipMouseHandler
}

export interface CanvasFieldChipBodyProps extends Omit<CanvasFieldChipProps, 'rowId'> {
  isOver: boolean
  listeners?: DraggableHandle['listeners']
  attributes?: DraggableHandle['attributes']
}
