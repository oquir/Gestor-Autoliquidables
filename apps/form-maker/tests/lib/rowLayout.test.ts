import { describe, expect, it } from 'vitest'
import {
  findFirstFit,
  findNearestFit,
  getFreeRuns,
  getLargestRun,
  getMaxSpanAt,
  migrateRows,
  repackRow,
  resolvePlacement,
  splitOverflowingRow,
} from '../../src/lib/rowLayout/rowLayout'
import type { CanvasField, CanvasRow } from '../../src/types'
import { makeField } from '../helpers/canvasFixtures'

// Columnas desde 1, como las lineas de grid de CSS. Una fila es una sola linea: lo que no cabe se
// rechaza, nunca pasa a una segunda linea.

function at(name: string, colStart: number, colSpan: number): CanvasField {
  return makeField('text', name, { colStart, colSpan })
}

function row(fields: CanvasField[], columns: number = 16): CanvasRow {
  return { id: 'fila', columns, fields }
}

function layout(result: CanvasRow): [string, number, number][] {
  return result.fields.map((field) => [field.name, field.colStart, field.colSpan])
}

describe('huecos libres', () => {
  it('getFreeRuns encuentra los tramos sin ocupar', () => {
    expect(getFreeRuns([at('a', 3, 4), at('b', 10, 2)], 16)).toEqual([
      { start: 1, length: 2 },
      { start: 7, length: 3 },
      { start: 12, length: 5 },
    ])
  })

  it('el campo que se mueve no se estorba a sí mismo', () => {
    expect(getFreeRuns([at('a', 1, 16)], 16, 'id-a')).toEqual([{ start: 1, length: 16 }])
  })

  it('una fila llena no tiene huecos', () => {
    expect(getFreeRuns([at('a', 1, 8), at('b', 9, 8)], 16)).toEqual([])
  })

  it('findFirstFit, getLargestRun y getMaxSpanAt', () => {
    const runs = getFreeRuns([at('a', 3, 4)], 16)

    expect(findFirstFit(runs, 3)).toBe(7)
    expect(findFirstFit(runs, 20)).toBeNull()
    expect(getLargestRun(runs)).toEqual({ start: 7, length: 10 })
    expect(getMaxSpanAt(runs, 10)).toBe(7)
    expect(getMaxSpanAt(runs, 4)).toBe(1)
  })
})

describe('findNearestFit: el imán', () => {
  const runs = getFreeRuns([at('a', 5, 4)], 16)

  it('desliza al hueco más cercano a donde se soltó', () => {
    // Pedido en la 7 (ocupada): el hueco 9-16 queda mas cerca que el 1-4.
    expect(findNearestFit(runs, 7, 3)).toBe(9)
    expect(findNearestFit(runs, 5, 3)).toBe(2)
  })

  it('null si no entra en ningún hueco', () => {
    expect(findNearestFit(runs, 1, 9)).toBeNull()
  })
})

describe('resolvePlacement', () => {
  it('respeta lo pedido si cabe', () => {
    expect(resolvePlacement(row([at('a', 1, 4)]), 4, { colStart: 9, colSpan: 4 })).toEqual({
      colStart: 9,
      colSpan: 4,
    })
  })

  it('sin pedido, el primer sitio donde entre', () => {
    expect(resolvePlacement(row([at('a', 1, 4)]), 4)).toEqual({ colStart: 5, colSpan: 4 })
  })

  it('si no entra entero, recortado en el tramo más ancho', () => {
    expect(resolvePlacement(row([at('a', 1, 10)]), 8)).toEqual({ colStart: 11, colSpan: 6 })
  })

  it('con la fila llena rechaza: nunca pasa a una segunda línea', () => {
    expect(resolvePlacement(row([at('a', 1, 16)]), 2)).toBeNull()
  })

  it('un ancho mayor que la fila se ajusta a la fila', () => {
    expect(resolvePlacement(row([]), 40)).toEqual({ colStart: 1, colSpan: 16 })
  })
})

describe('repackRow', () => {
  it('cambiar de columnas reempaqueta en orden y sin huecos', () => {
    const result: CanvasRow = repackRow(row([at('b', 9, 4), at('a', 3, 4)]), 12)

    expect(result.columns).toBe(12)
    expect(layout(result)).toEqual([
      ['a', 1, 4],
      ['b', 5, 4],
    ])
  })

  it('al encoger ninguno queda fuera: cada pendiente se reserva una columna', () => {
    const result: CanvasRow = repackRow(row([at('a', 1, 8), at('b', 9, 4), at('c', 13, 4)]), 4)

    expect(layout(result)).toEqual([
      ['a', 1, 2],
      ['b', 3, 1],
      ['c', 4, 1],
    ])
  })
})

describe('splitOverflowingRow y migrateRows', () => {
  it('cada línea visual desbordada pasa a ser una fila', () => {
    const lines: CanvasRow[] = splitOverflowingRow(
      row([at('a', 0, 10), at('b', 0, 10), at('c', 0, 4)]),
    )

    expect(lines.map((line) => line.id)).toEqual(['fila', 'fila-l1'])
    expect(lines.map(layout)).toEqual([
      [['a', 1, 10]],
      [
        ['b', 1, 10],
        ['c', 11, 4],
      ],
    ])
  })

  it('una fila vacía sigue siendo una fila', () => {
    expect(splitOverflowingRow(row([]))).toEqual([{ id: 'fila', columns: 16, fields: [] }])
  })

  it('solo migra si a algún campo le falta colStart', () => {
    const ok: CanvasRow[] = [row([at('a', 1, 10)])]
    const legacy = [
      { ...row([]), fields: [{ ...at('a', 1, 10), colStart: undefined as unknown as number }] },
    ]

    expect(migrateRows(ok)).toBe(ok)
    expect(layout(migrateRows(legacy)[0])).toEqual([['a', 1, 10]])
  })
})
