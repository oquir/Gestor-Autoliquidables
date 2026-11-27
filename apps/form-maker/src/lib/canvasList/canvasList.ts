import type { CanvasField } from '../../types/field'
import type { CanvasRow, RepeatableGroup } from '../../types/formStructure'
import type { CanvasListItem, CanvasListRow } from '../../types/canvasList'
import type { RowDropEdge, RowDropTarget } from '../../types/placement'
import { resolveRowDrop } from '../rowOrder'

// El paso como lista para el celular (P2 de docs/Plan-Movil.md), puro: filas sueltas y grupos
// repetibles como secciones, cada fila con sus campos en orden de colStart (como PreviewRowsGrid)
// y con su subir/bajar ya resuelto contra las reglas de rowOrder.
// Se mueve por bloques: una fila suelta salta un grupo entero (nunca entra en el), y una fila de
// grupo solo se mueve dentro de su grupo. Apuntar a la fila vecina con resolveRowDrop no alcanza:
// sobre el ultimo miembro de una banda devuelve "despues del grupo", donde la fila ya estaba.

// Filas seguidas de un mismo grupo forman un bloque; cada fila suelta es el suyo.
function toBlocks(rows: CanvasRow[]): CanvasRow[][] {
  const blocks: CanvasRow[][] = []
  for (const row of rows) {
    const last: CanvasRow[] | undefined = blocks[blocks.length - 1]
    if (row.groupId !== undefined && last && last[0].groupId === row.groupId) last.push(row)
    else blocks.push([row])
  }

  return blocks
}

function validTarget(
  rows: CanvasRow[],
  rowId: string,
  hoveredRowId: string,
  edge: RowDropEdge,
): RowDropTarget | null {
  const target: RowDropTarget | null = resolveRowDrop(rows, rowId, hoveredRowId, edge)

  return target?.isValid ? target : null
}

function byColumn(fields: CanvasField[]): CanvasField[] {
  return [...fields].sort((a, b) => a.colStart - b.colStart)
}

export function buildCanvasList(rows: CanvasRow[], groups: RepeatableGroup[]): CanvasListItem[] {
  const blocks: CanvasRow[][] = toBlocks(rows)
  const items: CanvasListItem[] = []

  blocks.forEach((block, blockIndex) => {
    const isGroup: boolean = block[0].groupId !== undefined
    const previousBlock: CanvasRow[] | undefined = blocks[blockIndex - 1]
    const nextBlock: CanvasRow[] | undefined = blocks[blockIndex + 1]

    const listRows: CanvasListRow[] = block.map((row, indexInBlock) => {
      const above: CanvasRow | undefined = isGroup ? block[indexInBlock - 1] : previousBlock?.[0]
      const below: CanvasRow | undefined = isGroup
        ? block[indexInBlock + 1]
        : nextBlock?.[nextBlock.length - 1]

      return {
        row,
        number: rows.indexOf(row) + 1,
        fields: byColumn(row.fields),
        moveUp: above ? validTarget(rows, row.id, above.id, 'before') : null,
        moveDown: below ? validTarget(rows, row.id, below.id, 'after') : null,
      }
    })

    const group: RepeatableGroup | undefined = isGroup
      ? groups.find((candidate) => candidate.id === block[0].groupId)
      : undefined

    if (group) items.push({ kind: 'group', group, rows: listRows })
    else for (const listRow of listRows) items.push({ kind: 'row', row: listRow })
  })

  return items
}
