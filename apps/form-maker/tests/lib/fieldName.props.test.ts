import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { slugifyFieldName, uniqueFieldName } from '../../src/lib/fieldName/fieldName'
import { RESERVED_FIELD_NAMES } from '../../src/lib/fieldName/fieldName.constants'

// Pruebas por propiedades del nombre de campo (ver numberFormat.props.test.ts): complementan
// fieldName.test.ts. El nombre sale de la etiqueta que escribe el autor, en cualquier idioma.

const IDENTIFIER: RegExp = /^[a-z_][a-z0-9_]*$/

// Etiquetas como las de una declaracion, mas lo raro: acentos, enie, digitos, simbolos, emoji y
// los nombres del prototipo.
const LABEL: fc.Arbitrary<string> = fc.oneof(
  fc.string({ maxLength: 40 }),
  fc.string({ unit: 'grapheme', maxLength: 20 }),
  fc
    .array(
      fc.constantFrom(
        'Base',
        'gravable',
        'Año',
        'ñandú',
        'Ítem',
        '1er',
        ' ',
        '-',
        '%',
        '(',
        ')',
        '/',
        '_',
        '🙂',
        'constructor',
        '__proto__',
        'toString',
      ),
      { maxLength: 6 },
    )
    .map((parts: string[]) => parts.join('')),
)

describe('slugifyFieldName y uniqueFieldName (propiedades)', () => {
  it('de cualquier etiqueta sale un identificador válido y no reservado', () => {
    fc.assert(
      fc.property(LABEL, (label: string) => {
        const name: string = slugifyFieldName(label)

        expect(name).toMatch(IDENTIFIER)
        expect(RESERVED_FIELD_NAMES.has(name)).toBe(false)
      }),
    )
  })

  it('convertir un nombre que ya salió no lo cambia', () => {
    fc.assert(
      fc.property(LABEL, (label: string) => {
        const name: string = slugifyFieldName(label)

        expect(slugifyFieldName(name)).toBe(name)
      }),
    )
  })

  it('el nombre único nunca está tomado y sigue siendo un identificador', () => {
    fc.assert(
      fc.property(LABEL, fc.array(LABEL, { maxLength: 10 }), (label: string, others: string[]) => {
        const taken: Set<string> = new Set(others.map(slugifyFieldName))
        const name: string = uniqueFieldName(slugifyFieldName(label), taken)

        expect(taken.has(name)).toBe(false)
        expect(name).toMatch(IDENTIFIER)
      }),
    )
  })
})
