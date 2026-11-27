import type { CanvasField } from '../../../types/field'
import type { CanvasRow } from '../../../types/formStructure'
import type { CanvasTarget, RowDropTarget } from '../../../types/placement'

export type RowSheetMode = 'actions' | 'columns' | 'styles' | 'move' | 'addField'

export interface RowSheetState {
  rowId: string
  mode: RowSheetMode
}

export type FieldDestination = 'sent' | 'internal' | 'pending' | 'none'

export interface MoveOption {
  target: CanvasTarget
  number: number
  title: string
}

export interface MoveSection {
  key: string
  caption?: string
  options: MoveOption[]
}

export interface CanvasListRowCardProps {
  row: CanvasRow
  rowNumber: number
  fields: CanvasField[]
  moveUp: RowDropTarget | null
  moveDown: RowDropTarget | null
  linkedLabels: Map<string, CanvasField>
  selectedSet: Set<string>
  isSelecting: boolean
  onFieldClick: (fieldId: string) => void
  onFieldLongPress: (fieldId: string) => void
  onMoveRow: (rowId: string, target: RowDropTarget) => void
  onOpenRowMenu: (rowId: string) => void
}
