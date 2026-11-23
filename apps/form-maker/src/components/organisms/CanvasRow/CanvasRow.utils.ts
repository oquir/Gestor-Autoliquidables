import type { CanvasRowProps, RowBorderState } from './CanvasRow.types'

// Punteado solo en filas vacias o recibiendo un arrastre. border-2 nunca se quita, solo se vuelve
// transparente: si no, la fila salta 2px al pasar el puntero.
export function getRowBorderClasses(state: RowBorderState): string {
  if (state.isOver) {
    return 'border-dashed border-slate-400 bg-slate-50 dark:border-neutral-500 dark:bg-neutral-800/60'
  }

  if (state.isEmpty) return 'border-dashed border-slate-200 dark:border-neutral-700'

  if (state.pinned) return 'border-slate-200 dark:border-neutral-700'

  return 'border-transparent hover:border-slate-200 dark:hover:border-neutral-800'
}

// Para el memo de CanvasRow: al escribir en un campo solo se repinta su fila. Del indice de
// etiquetas ligadas solo cuentan las de sus campos, porque el Map se rehace en cada edicion del
// paso; con el store compartiendo estructura, una etiqueta que no cambio es el mismo objeto.
export function sameRowProps(prev: CanvasRowProps, next: CanvasRowProps): boolean {
  if (
    prev.row !== next.row ||
    prev.offsetY !== next.offsetY ||
    prev.enterIndex !== next.enterIndex ||
    prev.onFieldContextMenu !== next.onFieldContextMenu
  ) {
    return false
  }

  return next.row.fields.every(
    (field) => prev.linkedLabels.get(field.id) === next.linkedLabels.get(field.id),
  )
}
