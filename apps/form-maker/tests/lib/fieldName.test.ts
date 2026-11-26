import { describe, expect, it } from 'vitest'
import {
  collectFieldNames,
  migrateFieldNames,
  slugifyFieldName,
  uniqueFieldName,
} from '../../src/lib/fieldName/fieldName'
import type { CanvasRow, FieldRename } from '../../src/types'
import { makeField, makeRow } from '../helpers/canvasFixtures'

describe('slugifyFieldName', () => {
  it('saca acentos, pasa a minúsculas y une con guion bajo', () => {
    expect(slugifyFieldName('Número de Documento')).toBe('numero_de_documento')
    expect(slugifyFieldName('  Año gravable / Período  ')).toBe('ano_gravable_periodo')
    expect(slugifyFieldName('Ñandú')).toBe('nandu')
  })

  it('sin letras usa el nombre de respaldo; con dígito inicial lo antepone', () => {
    expect(slugifyFieldName('')).toBe('campo')
    expect(slugifyFieldName('¿?')).toBe('campo')
    expect(slugifyFieldName('31. Sanciones')).toBe('campo_31_sanciones')
    // Un nombre del prototipo de Object leeria la funcion Object como valor del campo.
    expect(slugifyFieldName('Constructor')).toBe('constructor_campo')
  })
})

describe('uniqueFieldName', () => {
  it('devuelve el mismo si está libre y si no suma un sufijo', () => {
    expect(uniqueFieldName('total', new Set())).toBe('total')
    expect(uniqueFieldName('total', new Set(['total']))).toBe('total_2')
    expect(uniqueFieldName('total', new Set(['total', 'total_2']))).toBe('total_3')
  })

  // Hallazgo 4.10 de docs/Hallazgos-Pruebas.md: solo desempata. Los reservados los saca quien lo
  // llama (slugifyFieldName o migrateFieldNames), que es lo que se prueba arriba.
  it('no filtra los nombres reservados: eso lo hace quien lo llama', () => {
    expect(uniqueFieldName('__proto__', new Set())).toBe('__proto__')
  })
})

describe('collectFieldNames', () => {
  it('junta los nombres, menos el del campo que se edita', () => {
    const rows: CanvasRow[] = [makeRow([makeField('text', 'a'), makeField('text', 'b')])]

    expect([...collectFieldNames(rows)]).toEqual(['a', 'b'])
    expect([...collectFieldNames(rows, 'id-a')]).toEqual(['b'])
  })
})

describe('migrateFieldNames', () => {
  it('el primero conserva el nombre y el repetido se renombra y se reporta', () => {
    const renamed: FieldRename[] = []
    const rows: CanvasRow[] = migrateFieldNames(
      [
        makeRow([
          makeField('text', 'total', { label: 'Total' }),
          makeField('text', 'total', { id: 'otro', label: 'Total bis' }),
        ]),
      ],
      new Set(),
      renamed,
    )

    expect(rows[0].fields.map((field) => field.name)).toEqual(['total', 'total_2'])
    expect(renamed).toEqual([{ from: 'total', to: 'total_2', label: 'Total bis' }])
  })

  it('un nombre reservado de un borrador se renombra y se reporta', () => {
    const renamed: FieldRename[] = []
    const rows: CanvasRow[] = migrateFieldNames(
      [
        makeRow([
          makeField('text', 'constructor', { label: 'Constructor' }),
          makeField('text', '__proto__', { id: 'otro', label: 'Proto' }),
        ]),
      ],
      new Set(),
      renamed,
    )

    expect(rows[0].fields.map((field) => field.name)).toEqual(['constructor_campo', 'proto'])
    expect(renamed.map((rename) => rename.to)).toEqual(['constructor_campo', 'proto'])
  })

  it('un campo intacto queda como el mismo objeto', () => {
    const row: CanvasRow = makeRow([makeField('text', 'a')])
    const rows: CanvasRow[] = migrateFieldNames([row], new Set())

    expect(rows[0].fields[0]).toBe(row.fields[0])
  })
})
