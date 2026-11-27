import type { CanvasField } from './field'
import type { CanvasRow, RepeatableGroup } from './formStructure'
import type { RowDropTarget } from './placement'

// El paso como lista, para editarlo en el celular (P2 de docs/Plan-Movil.md).
export interface CanvasListRow {
  row: CanvasRow
  // Desde 1, en el orden del paso: "Fila 3".
  number: number
  // Por colStart, el orden en que se leen.
  fields: CanvasField[]
  // Listos para moveRow; null en el borde (del paso, o del grupo para una fila de grupo).
  moveUp: RowDropTarget | null
  moveDown: RowDropTarget | null
}

export type CanvasListItem =
  | { kind: 'row'; row: CanvasListRow }
  | { kind: 'group'; group: RepeatableGroup; rows: CanvasListRow[] }
