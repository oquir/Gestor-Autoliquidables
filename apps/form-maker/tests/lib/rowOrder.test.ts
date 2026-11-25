import { describe, expect, it } from 'vitest'
import { reorderRows, resolveBandDrop, resolveRowDrop } from '../../src/lib/rowOrder/rowOrder'
import type { CanvasRow } from '../../src/types'

// Una fila nunca entra ni sale de un grupo arrastrando: limpiaria el mapeo de sus campos en
// silencio.

function rowOf(id: string, groupId?: string): CanvasRow {
  return { id, columns: 16, fields: [], ...(groupId ? { groupId } : {}) }
}

// a, [g1, g2, g3] del grupo g, b
const rows: CanvasRow[] = [
  rowOf('a'),
  rowOf('g1', 'g'),
  rowOf('g2', 'g'),
  rowOf('g3', 'g'),
  rowOf('b'),
]

function ids(list: CanvasRow[]): string[] {
  return list.map((row) => row.id)
}

describe('resolveRowDrop', () => {
  it('entre filas de la misma pertenencia se reordena libre', () => {
    expect(resolveRowDrop(rows, 'a', 'b', 'after')).toEqual({
      rowId: 'b',
      edge: 'after',
      isValid: true,
    })
    expect(resolveRowDrop(rows, 'g1', 'g3', 'after')?.isValid).toBe(true)
  })

  it('una fila del grupo no puede salir', () => {
    expect(resolveRowDrop(rows, 'g1', 'b', 'after')?.isValid).toBe(false)
  })

  it('una suelta sobre el grupo se pega al borde más cercano', () => {
    expect(resolveRowDrop(rows, 'b', 'g1', 'before')).toEqual({
      rowId: 'g1',
      edge: 'before',
      isValid: true,
    })
    expect(resolveRowDrop(rows, 'a', 'g3', 'after')).toEqual({
      rowId: 'g3',
      edge: 'after',
      isValid: true,
    })
  })

  it('una fila que ya no existe no da destino', () => {
    expect(resolveRowDrop(rows, 'nada', 'a', 'after')).toBeNull()
  })
})

describe('resolveBandDrop', () => {
  it('la cabecera de la banda manda al borde de arriba o al de abajo', () => {
    expect(resolveBandDrop(rows, 'b', 'g', 'before')).toEqual({
      rowId: 'g1',
      edge: 'before',
      isValid: true,
    })
    expect(resolveBandDrop(rows, 'a', 'g', 'after')).toEqual({
      rowId: 'g3',
      edge: 'after',
      isValid: true,
    })
  })

  it('sobre su propio grupo no señala nada; desde otro grupo es inválido', () => {
    const withTwo: CanvasRow[] = [...rows, rowOf('h1', 'h')]

    expect(resolveBandDrop(withTwo, 'g1', 'g', 'before')).toBeNull()
    expect(resolveBandDrop(withTwo, 'h1', 'g', 'before')?.isValid).toBe(false)
  })
})

describe('reorderRows', () => {
  it('mueve antes o después del destino', () => {
    expect(ids(reorderRows(rows, 'b', { rowId: 'a', edge: 'before', isValid: true }))).toEqual([
      'b',
      'a',
      'g1',
      'g2',
      'g3',
    ])
    expect(ids(reorderRows(rows, 'g1', { rowId: 'g3', edge: 'after', isValid: true }))).toEqual([
      'a',
      'g2',
      'g3',
      'g1',
      'b',
    ])
  })

  it('soltarla junto a sí misma o un destino inválido devuelve las mismas filas', () => {
    expect(reorderRows(rows, 'a', { rowId: 'a', edge: 'after', isValid: true })).toBe(rows)
    expect(reorderRows(rows, 'a', { rowId: 'g1', edge: 'before', isValid: true })).toBe(rows)
    expect(reorderRows(rows, 'a', { rowId: 'b', edge: 'after', isValid: false })).toBe(rows)
    expect(reorderRows(rows, 'a', { rowId: 'otro-lienzo', edge: 'after', isValid: true })).toBe(
      rows,
    )
  })

  it('las filas de un grupo salteadas se vuelven a juntar', () => {
    const scattered: CanvasRow[] = [rowOf('g1', 'g'), rowOf('a'), rowOf('g2', 'g'), rowOf('b')]

    expect(ids(reorderRows(scattered, 'b', { rowId: 'a', edge: 'before', isValid: true }))).toEqual(
      ['g1', 'g2', 'b', 'a'],
    )
  })
})
