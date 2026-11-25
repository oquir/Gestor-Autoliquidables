import { describe, expect, it } from 'vitest'
import {
  canTransfer,
  collectCrossingRefs,
  planLanding,
  transferGroup,
} from '../../src/lib/fieldTransfer/fieldTransfer'
import type { CanvasField, CanvasRow } from '../../src/types'
import { fieldId, makeField, makeRow } from '../helpers/canvasFixtures'

function freshRow(): CanvasRow {
  return { id: 'nueva', columns: 16, fields: [] }
}

describe('canTransfer', () => {
  const rows: CanvasRow[] = [
    makeRow([makeField('text', 'a')]),
    { ...makeRow([makeField('number', 'g')]), id: 'fila-grupo', groupId: 'g' },
  ]

  it('un campo que existe se puede mudar; uno borrado no', () => {
    expect(canTransfer(rows, { kind: 'field', fieldId: 'id-a' })).toEqual({ allowed: true })
    expect(canTransfer(rows, { kind: 'field', fieldId: 'id-x' }).allowed).toBe(false)
  })

  it('una fila de un grupo no cambia de paso', () => {
    expect(canTransfer(rows, { kind: 'row', rowId: 'fila-grupo' })).toEqual({
      allowed: false,
      reason: 'Una fila de un grupo repetible no se puede mover de paso.',
    })
    expect(canTransfer(rows, { kind: 'row', rowId: 'fila-a' }).allowed).toBe(true)
    expect(canTransfer(rows, { kind: 'row', rowId: 'nada' }).allowed).toBe(false)
  })
})

describe('transferGroup', () => {
  const rows: CanvasRow[] = [
    makeRow([
      makeField('label', 'rotulo', { labelFor: fieldId('valor') }),
      makeField('number', 'valor'),
      makeField('text', 'solo'),
    ]),
  ]

  it('la etiqueta y su campo se mudan juntos, la etiqueta primero', () => {
    expect(transferGroup(rows, 'id-valor').map((f) => f.name)).toEqual(['rotulo', 'valor'])
    expect(transferGroup(rows, 'id-rotulo').map((f) => f.name)).toEqual(['rotulo', 'valor'])
  })

  it('un campo sin pareja va solo; uno que no existe, nada', () => {
    expect(transferGroup(rows, 'id-solo').map((f) => f.name)).toEqual(['solo'])
    expect(transferGroup(rows, 'id-x')).toEqual([])
  })
})

describe('planLanding', () => {
  function placed(rows: CanvasRow[]): [string, string, number, number][] {
    return rows.flatMap((row) =>
      row.fields.map((field): [string, string, number, number] => [
        row.id,
        field.name,
        field.colStart,
        field.colSpan,
      ]),
    )
  }

  it('entra en la primera fila con hueco, en el hueco más a la izquierda', () => {
    const rows: CanvasRow[] = [makeRow([makeField('text', 'a', { colSpan: 12 })])]
    const moving: CanvasField[] = [makeField('text', 'm', { colSpan: 4 })]

    expect(placed(planLanding(rows, moving, freshRow))).toEqual([
      ['fila-a', 'a', 1, 12],
      ['fila-a', 'm', 13, 4],
    ])
  })

  it('si no entra entero no se recorta: va a una fila nueva', () => {
    const rows: CanvasRow[] = [makeRow([makeField('text', 'a', { colSpan: 12 })])]
    const moving: CanvasField[] = [makeField('text', 'm', { colSpan: 6 })]

    expect(placed(planLanding(rows, moving, freshRow))).toEqual([
      ['fila-a', 'a', 1, 12],
      ['nueva', 'm', 1, 6],
    ])
  })

  it('un grupo repetible no recibe mudanzas', () => {
    const rows: CanvasRow[] = [{ ...makeRow([]), id: 'grupo', groupId: 'g' }]

    expect(placed(planLanding(rows, [makeField('text', 'm')], freshRow))).toEqual([
      ['nueva', 'm', 1, 4],
    ])
  })

  it('no toca las filas de entrada', () => {
    const rows: CanvasRow[] = [makeRow([makeField('text', 'a')])]
    planLanding(rows, [makeField('text', 'm')], freshRow)

    expect(rows[0].fields).toHaveLength(1)
  })
})

describe('collectCrossingRefs', () => {
  it('avisa si un campo del modal depende de uno del formulario', () => {
    const formRows: CanvasRow[] = [makeRow([makeField('text', 'tipo')])]
    const toIntro: CanvasField[] = [
      makeField('text', 'detalle', {
        label: 'Detalle',
        visibleWhen: { fieldId: fieldId('tipo'), operator: 'isNotEmpty' },
      }),
      makeField('text', 'libre', { label: 'Libre' }),
    ]

    expect(collectCrossingRefs(formRows, toIntro, true)).toEqual(['Detalle'])
  })

  it('mudar al formulario un campo del que depende el modal también avisa', () => {
    const introRows: CanvasRow[] = [
      makeRow([
        makeField('select', 'municipio', {
          label: 'Municipio',
          dataSource: { catalog: 'municipios', dependsOn: fieldId('depto') },
        }),
      ]),
    ]

    expect(collectCrossingRefs(introRows, [makeField('select', 'depto')], false)).toEqual([
      'Municipio',
    ])
  })
})
