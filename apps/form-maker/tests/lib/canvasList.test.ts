import { describe, expect, it } from 'vitest'
import { buildCanvasList } from '../../src/lib/canvasList/canvasList'
import { reorderRows } from '../../src/lib/rowOrder/rowOrder'
import type { CanvasListItem, CanvasListRow, CanvasRow } from '../../src/types'
import { makeField, makeGroup, makeRow } from '../helpers/canvasFixtures'

// El paso como lista del celular: sueltas y grupos, campos por columna y subir/bajar por bloques.

const suelta1: CanvasRow = makeRow([makeField('text', 'a')])
const grupoA: CanvasRow = makeRow([makeField('text', 'g1')], 'grupo-act')
const grupoB: CanvasRow = makeRow([makeField('text', 'g2')], 'grupo-act')
const suelta2: CanvasRow = makeRow([makeField('text', 'b')])
const rows: CanvasRow[] = [suelta1, grupoA, grupoB, suelta2]
const groups = [makeGroup('act')]

function listRows(items: CanvasListItem[]): CanvasListRow[] {
  return items.flatMap((item) => (item.kind === 'row' ? [item.row] : item.rows))
}

function order(result: CanvasRow[]): string[] {
  return result.map((row) => row.id)
}

describe('buildCanvasList', () => {
  const items: CanvasListItem[] = buildCanvasList(rows, groups)

  it('las filas sueltas van solas y las del grupo en su sección', () => {
    expect(items.map((item) => item.kind)).toEqual(['row', 'group', 'row'])
    const group = items[1]
    expect(group.kind === 'group' && group.group.id).toBe('grupo-act')
    expect(group.kind === 'group' && group.rows.map((r) => r.number)).toEqual([2, 3])
  })

  it('numera en el orden del paso', () => {
    expect(listRows(items).map((r) => r.number)).toEqual([1, 2, 3, 4])
  })

  it('ordena los campos por columna aunque vengan desordenados', () => {
    const row: CanvasRow = {
      id: 'fila-x',
      columns: 16,
      fields: [
        makeField('text', 'derecha', { colStart: 9 }),
        makeField('text', 'izquierda', { colStart: 1 }),
      ],
    }
    const [item] = buildCanvasList([row], [])

    expect(item.kind === 'row' && item.row.fields.map((f) => f.name)).toEqual([
      'izquierda',
      'derecha',
    ])
  })

  it('una suelta salta el grupo entero al subir y al bajar', () => {
    const [primera, , , ultima] = listRows(items)

    expect(primera.moveUp).toBeNull()
    expect(order(reorderRows(rows, primera.row.id, primera.moveDown!))).toEqual(
      order([grupoA, grupoB, suelta1, suelta2]),
    )
    expect(order(reorderRows(rows, ultima.row.id, ultima.moveUp!))).toEqual(
      order([suelta1, suelta2, grupoA, grupoB]),
    )
    expect(ultima.moveDown).toBeNull()
  })

  it('una fila de grupo solo se mueve dentro de su grupo', () => {
    const [, miembro1, miembro2] = listRows(items)

    expect(miembro1.moveUp).toBeNull()
    expect(miembro2.moveDown).toBeNull()
    expect(order(reorderRows(rows, miembro1.row.id, miembro1.moveDown!))).toEqual(
      order([suelta1, grupoB, grupoA, suelta2]),
    )
  })

  it('un grupo que ya no existe deja sus filas como sueltas, movibles solo entre ellas', () => {
    const huerfanas = buildCanvasList(rows, [])

    expect(huerfanas.map((item) => item.kind)).toEqual(['row', 'row', 'row', 'row'])
    expect(listRows(huerfanas)[1].moveUp).toBeNull()
  })
})
