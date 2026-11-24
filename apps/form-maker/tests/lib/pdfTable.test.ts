import { describe, expect, it } from 'vitest'
import {
  canMerge,
  canSplit,
  cellsInRect,
  createTable,
  insertColumn,
  insertRow,
  mergeCells,
  normalizeTable,
  placeCells,
  removeColumn,
  removeRow,
  selectionRect,
  setColumnWidth,
  setRowHeight,
  splitCell,
} from '../../src/lib/pdfTable/pdfTable'
import type { PdfCell, PdfTable } from '../../src/types'

// Las celdas se nombran por su posicion para leer las pruebas: c00 es fila 0, columna 0.

function cell(id: string, extra: Partial<PdfCell> = {}): PdfCell {
  return { id, colSpan: 1, rowSpan: 1, content: { kind: 'text', text: id }, ...extra }
}

function grid(rows: number, cols: number): PdfTable {
  return {
    id: 't',
    columns: Array.from({ length: cols }, (_, c) => ({ id: `col${c}` })),
    rows: Array.from({ length: rows }, (_, r) => ({
      id: `row${r}`,
      cells: Array.from({ length: cols }, (_, c) => cell(`c${r}${c}`)),
    })),
  }
}

// La rejilla como la ve el navegador: el id de la celda que cubre cada posicion.
function layout(table: PdfTable): string[][] {
  const { placed, rowCount, colCount } = placeCells(table)
  return Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: colCount }, (_, col) => {
      const found = placed.find(
        (item) =>
          item.row <= row &&
          row < item.row + item.cell.rowSpan &&
          item.col <= col &&
          col < item.col + item.cell.colSpan,
      )
      return found ? found.cell.id : '·'
    }),
  )
}

describe('crear y ubicar', () => {
  it('una tabla nueva trae todas las celdas con bordes', () => {
    const table: PdfTable = createTable(3, 2)

    expect(table.columns).toHaveLength(3)
    expect(table.rows).toHaveLength(2)
    expect(table.rows[0].cells[0].borders).toEqual({
      top: true,
      right: true,
      bottom: true,
      left: true,
    })
  })

  it('placeCells salta los rowspan de arriba, como el navegador', () => {
    const table: PdfTable = {
      id: 't',
      columns: [{ id: 'a' }, { id: 'b' }],
      rows: [
        { id: 'r0', cells: [cell('alta', { rowSpan: 2 }), cell('c01')] },
        { id: 'r1', cells: [cell('c11')] },
      ],
    }

    expect(layout(table)).toEqual([
      ['alta', 'c01'],
      ['alta', 'c11'],
    ])
  })

  it('una span que no cabe se recorta', () => {
    const table: PdfTable = {
      id: 't',
      columns: [{ id: 'a' }],
      rows: [{ id: 'r0', cells: [cell('larga', { rowSpan: 5 })] }],
    }

    expect(placeCells(table).placed[0].cell.rowSpan).toBe(1)
  })

  it('normalizeTable rellena huecos y columnas; una tabla sana queda igual', () => {
    const ragged: PdfTable = {
      id: 't',
      columns: [{ id: 'a' }],
      rows: [
        { id: 'r0', cells: [cell('x'), cell('y')] },
        { id: 'r1', cells: [cell('z')] },
      ],
    }
    const fixed: PdfTable = normalizeTable(ragged)

    expect(fixed.columns).toHaveLength(2)
    expect(fixed.rows[1].cells).toHaveLength(2)
    const healthy: PdfTable = grid(2, 2)
    expect(normalizeTable(healthy)).toBe(healthy)
  })
})

describe('selección y combinar', () => {
  it('el rectángulo crece hasta no cortar una combinada', () => {
    const table: PdfTable = mergeCells(grid(3, 3), 'c01', 'c11')
    const rect = selectionRect(table, 'c00', 'c00')

    expect(rect).toEqual({ top: 0, left: 0, bottom: 0, right: 0 })
    // c01 baja hasta la fila 1: elegir c00 y c01 arrastra esa fila.
    expect(selectionRect(table, 'c00', 'c01')).toEqual({ top: 0, left: 0, bottom: 1, right: 1 })
    expect(selectionRect(table, 'c00', 'c10')).toEqual({ top: 0, left: 0, bottom: 1, right: 0 })
  })

  it('mergeCells deja la de arriba a la izquierda y junta los textos', () => {
    const merged: PdfTable = mergeCells(grid(2, 3), 'c00', 'c11')

    expect(layout(merged)).toEqual([
      ['c00', 'c00', 'c02'],
      ['c00', 'c00', 'c12'],
    ])
    const origin = placeCells(merged).placed.find((item) => item.cell.id === 'c00')
    expect(origin?.cell.content).toEqual({ kind: 'text', text: 'c00 c01 c10 c11' })
  })

  it('si alguna no es texto queda el contenido de la de origen', () => {
    const table: PdfTable = grid(1, 2)
    table.rows[0].cells[1] = cell('c01', { content: { kind: 'html', html: '<b>x</b>' } })

    const merged: PdfTable = mergeCells(table, 'c00', 'c01')
    expect(merged.rows[0].cells[0].content).toEqual({ kind: 'text', text: 'c00' })
  })

  it('canMerge pide más de una celda; canSplit, una combinada', () => {
    const table: PdfTable = grid(2, 2)

    expect(canMerge(table, 'c00', 'c00')).toBe(false)
    expect(canMerge(table, 'c00', 'c01')).toBe(true)
    expect(canSplit(table, 'c00')).toBe(false)
    expect(canSplit(mergeCells(table, 'c00', 'c01'), 'c00')).toBe(true)
  })

  it('splitCell vuelve a 1x1 y rellena con celdas vacías', () => {
    const split: PdfTable = splitCell(mergeCells(grid(2, 2), 'c00', 'c11'), 'c00')

    expect(layout(split)[0][0]).toBe('c00')
    expect(placeCells(split).placed).toHaveLength(4)
    expect(splitCell(grid(2, 2), 'c00')).toEqual(grid(2, 2))
  })

  it('cellsInRect da las celdas de adentro', () => {
    expect(cellsInRect(grid(3, 3), { top: 1, left: 1, bottom: 2, right: 2 })).toEqual([
      'c11',
      'c12',
      'c21',
      'c22',
    ])
  })
})

describe('filas y columnas', () => {
  it('insertar una fila debajo suma una celda por columna', () => {
    const table: PdfTable = insertRow(grid(2, 2), 'c00', 'below')

    expect(table.rows).toHaveLength(3)
    expect(layout(table)[0]).toEqual(['c00', 'c01'])
    expect(table.rows[1].cells).toHaveLength(2)
  })

  it('una combinada que cruza la fila nueva se estira en vez de partirse', () => {
    const tall: PdfTable = mergeCells(grid(2, 2), 'c00', 'c10')
    const table: PdfTable = insertRow(tall, 'c01', 'below')

    expect(layout(table).map((row) => row[0])).toEqual(['c00', 'c00', 'c00'])
    expect(table.rows[1].cells).toHaveLength(1)
  })

  it('quitar una fila; la última no se quita', () => {
    expect(removeRow(grid(2, 2), 'c00').rows).toHaveLength(1)
    const single: PdfTable = grid(1, 2)
    expect(removeRow(single, 'c00')).toBe(single)
  })

  it('una combinada que baja desde la fila quitada sigue viva abajo', () => {
    const tall: PdfTable = mergeCells(grid(3, 1), 'c00', 'c10')
    const table: PdfTable = removeRow(tall, 'c00')

    expect(layout(table)).toEqual([['c00'], ['c20']])
  })

  it('insertar y quitar columnas', () => {
    const wider: PdfTable = insertColumn(grid(2, 2), 'c00', 'left')

    expect(wider.columns).toHaveLength(3)
    expect(layout(wider)[0][1]).toBe('c00')
    expect(removeColumn(grid(2, 2), 'c01').columns).toHaveLength(1)
    const single: PdfTable = grid(2, 1)
    expect(removeColumn(single, 'c00')).toBe(single)
  })

  it('ancho y alto: igual valor, misma tabla; undefined vuelve al automático', () => {
    const table: PdfTable = setColumnWidth(grid(1, 2), 0, 120)

    expect(table.columns[0]).toEqual({ id: 'col0', width: 120 })
    expect(setColumnWidth(table, 0, 120)).toBe(table)
    expect(setColumnWidth(table, 0, undefined).columns[0]).toEqual({ id: 'col0' })
    expect(setColumnWidth(table, 9, 10)).toBe(table)

    const tall: PdfTable = setRowHeight(grid(1, 1), 'row0', 30)
    expect(tall.rows[0].height).toBe(30)
    expect(setRowHeight(tall, 'row0', 30)).toBe(tall)
    expect('height' in setRowHeight(tall, 'row0', undefined).rows[0]).toBe(false)
  })
})
