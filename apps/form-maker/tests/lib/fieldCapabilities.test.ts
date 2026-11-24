import { describe, expect, it } from 'vitest'
import { FIELD_TYPES } from '../../src/constants/fieldTypes'
import { affixOf, supportsAffixes } from '../../src/lib/fieldAffix/fieldAffix'
import {
  conceptKindOf,
  conceptOwners,
  isValidConceptId,
  parseConceptId,
} from '../../src/lib/fieldConcept/fieldConcept'
import {
  builtInFormatOf,
  effectivePattern,
  isContactField,
  phoneKindOf,
} from '../../src/lib/fieldContact/fieldContact'
import {
  buildLinkedLabelIndex,
  findLabelFor,
  hasLinkedLabel,
  isInputField,
  isNumericField,
  isPresentationalField,
  labelTargetCandidates,
} from '../../src/lib/fieldKind/fieldKind'
import {
  effectiveMaxLength,
  exportableMaxLength,
  maxLengthOf,
  supportsMaxLength,
} from '../../src/lib/fieldLength/fieldLength'
import {
  allowsManualOptions,
  exportableInlineOptions,
  exportableOptions,
  isMultiValueField,
  isOptionBasedField,
} from '../../src/lib/fieldOptions/fieldOptions'
import { placeholderOf, supportsPlaceholder } from '../../src/lib/fieldPlaceholder/fieldPlaceholder'
import {
  allowsNegative,
  clampNegative,
  exportableAllowsNegative,
} from '../../src/lib/fieldSign/fieldSign'
import {
  parseSuggestionsText,
  suggestionsOf,
  suggestionsText,
} from '../../src/lib/fieldSuggestions/fieldSuggestions'
import {
  createEmptyTooltip,
  exportableTooltip,
  hasTooltip,
} from '../../src/lib/fieldTooltip/fieldTooltip'
import type { CanvasField } from '../../src/types'
import { makeField } from '../helpers/canvasFixtures'

// Que admite cada tipo de campo. La regla de fondo es la misma en todos: un tipo que no admite una
// opcion la ignora aunque quede guardada en el store.

describe('tipos de campo', () => {
  it('presentacional, de entrada y numérico', () => {
    expect(isPresentationalField('label')).toBe(true)
    expect(isPresentationalField('rich_text')).toBe(true)
    expect(isInputField('text')).toBe(true)
    expect(isNumericField('calculated')).toBe(true)
    expect(isNumericField('text')).toBe(false)
  })

  it('cada tipo de la paleta es o presentacional o de entrada', () => {
    for (const { type } of FIELD_TYPES) {
      expect(isPresentationalField(type)).toBe(!isInputField(type))
    }
  })
})

describe('etiquetas vinculadas', () => {
  const fields: CanvasField[] = [
    makeField('label', 'rotulo', { labelFor: 'id-a' }),
    makeField('text', 'a'),
    makeField('text', 'b'),
    makeField('label', 'libre'),
  ]

  it('encuentra la etiqueta de un campo y el índice da la primera', () => {
    expect(findLabelFor(fields, 'id-a')?.name).toBe('rotulo')
    expect(findLabelFor(fields, 'id-b')).toBeNull()
    expect(hasLinkedLabel(fields, 'id-a')).toBe(true)
    expect(buildLinkedLabelIndex(fields).get('id-a')?.name).toBe('rotulo')
  })

  it('una etiqueta puede apuntar a un campo sin etiqueta o a su destino actual', () => {
    expect(labelTargetCandidates(fields, 'id-rotulo').map((f) => f.name)).toEqual(['a', 'b'])
    expect(labelTargetCandidates(fields, 'id-libre').map((f) => f.name)).toEqual(['b'])
  })
})

describe('afijos, placeholder y sugerencias', () => {
  it('los afijos solo en numéricos, recortados', () => {
    expect(supportsAffixes('number')).toBe(true)
    expect(affixOf({ type: 'number', prefix: ' $ ' }, 'prefix')).toBe('$')
    expect(affixOf({ type: 'number', suffix: '   ' }, 'suffix')).toBeUndefined()
    expect(affixOf({ type: 'text', prefix: '$' }, 'prefix')).toBeUndefined()
  })

  it('el placeholder no va en la fecha ni en las casillas', () => {
    expect(placeholderOf({ type: 'text', placeholder: '  Nombre ' })).toBe('Nombre')
    expect(supportsPlaceholder('date')).toBe(false)
    expect(placeholderOf({ type: 'checkbox', placeholder: 'x' })).toBeUndefined()
  })

  it('las sugerencias solo en el texto con sugerencias, sin vacías ni repetidas', () => {
    expect(suggestionsOf({ type: 'datalist', suggestions: [' A', 'B', '', 'A '] })).toEqual([
      'A',
      'B',
    ])
    expect(suggestionsOf({ type: 'datalist', suggestions: [' ', ''] })).toBeUndefined()
    expect(suggestionsOf({ type: 'text', suggestions: ['A'] })).toBeUndefined()
  })

  it('el texto de las sugerencias hace ida y vuelta exacta', () => {
    const suggestions: string[] = ['Bogotá', ' Cali', '']
    const text: string = suggestionsText({ type: 'datalist', suggestions })

    expect(parseSuggestionsText(text)).toEqual(suggestions)
    expect(parseSuggestionsText('')).toBeUndefined()
  })
})

describe('largo máximo', () => {
  it('cero o ausente es sin tope', () => {
    expect(effectiveMaxLength(0)).toBeUndefined()
    expect(effectiveMaxLength(undefined)).toBeUndefined()
    expect(effectiveMaxLength(5)).toBe(5)
  })

  it('solo en texto y números', () => {
    expect(supportsMaxLength('textarea')).toBe(true)
    expect(supportsMaxLength('select')).toBe(false)
    expect(exportableMaxLength({ type: 'text', validations: { maxLength: 9 } })).toBe(9)
    expect(exportableMaxLength({ type: 'date', validations: { maxLength: 9 } })).toBeUndefined()
    expect(maxLengthOf({ type: 'number', maxLength: 4 })).toBe(4)
  })
})

describe('signo', () => {
  it('ausente admite negativos; solo false restringe y solo ese viaja', () => {
    expect(allowsNegative({ type: 'number' })).toBe(true)
    expect(allowsNegative({ type: 'number', allowsNegative: false })).toBe(false)
    expect(exportableAllowsNegative({ type: 'number', allowsNegative: true })).toBeUndefined()
    expect(exportableAllowsNegative({ type: 'number', allowsNegative: false })).toBe(false)
    expect(exportableAllowsNegative({ type: 'text', allowsNegative: false })).toBeUndefined()
  })

  it('clampNegative lleva a 0 solo un negativo de verdad', () => {
    const field = { type: 'number', allowsNegative: false }

    expect(clampNegative(field, -5)).toEqual({ value: 0, clamped: true })
    expect(clampNegative(field, '-5')).toEqual({ value: 0, clamped: true })
    expect(clampNegative(field, 5)).toEqual({ value: 5, clamped: false })
    expect(clampNegative(field, '')).toEqual({ value: '', clamped: false })
    expect(clampNegative({ type: 'number' }, -5)).toEqual({ value: -5, clamped: false })
  })
})

describe('opciones', () => {
  it('solo un campo de opciones fuera del contrato y sin catálogo las lleva a mano', () => {
    const options = [{ id: 'a', label: 'A' }]

    expect(
      allowsManualOptions(makeField('select', 's', { apiBinding: { kind: 'excluded' } })),
    ).toBe(true)
    expect(allowsManualOptions(makeField('select', 's', { apiBinding: { kind: 'concept' } }))).toBe(
      true,
    )
    expect(allowsManualOptions(makeField('select', 's'))).toBe(false)
    expect(
      allowsManualOptions(
        makeField('select', 's', {
          apiBinding: { kind: 'excluded' },
          dataSource: { catalog: 'x' },
        }),
      ),
    ).toBe(false)
    expect(
      exportableOptions(makeField('text', 't', { apiBinding: { kind: 'excluded' }, options })),
    ).toBeUndefined()
  })

  it('multiselección y opciones en línea', () => {
    expect(isOptionBasedField('toggle_group')).toBe(true)
    expect(isMultiValueField('checkbox_group')).toBe(true)
    expect(isMultiValueField('select')).toBe(false)
    expect(exportableInlineOptions({ type: 'radio_group', inlineOptions: true })).toBe(true)
    expect(exportableInlineOptions({ type: 'toggle_group', inlineOptions: true })).toBeUndefined()
  })
})

describe('teléfono y correo', () => {
  it('el teléfono es celular si no dice otra cosa', () => {
    expect(isContactField('tel')).toBe(true)
    expect(phoneKindOf({ type: 'tel' })).toBe('celular')
    expect(builtInFormatOf({ type: 'tel', phoneKind: 'fax' })).toBeDefined()
    expect(builtInFormatOf({ type: 'text' })).toBeUndefined()
  })

  it('el patrón del autor reemplaza al de fábrica y sin mensaje toma el del tipo', () => {
    const email = { type: 'email' }

    expect(effectivePattern(email, {})).toEqual(builtInFormatOf(email))
    expect(effectivePattern(email, { pattern: '^x$' })).toEqual({
      pattern: '^x$',
      message: 'Ingrese un correo válido',
    })
    expect(effectivePattern({ type: 'text' }, {})).toBeUndefined()
  })
})

describe('tooltip', () => {
  it('vacío o en un tipo que no lo admite no viaja', () => {
    const filled = {
      content: [{ type: 'paragraph' as const, children: [{ text: 'Ayuda' }] }],
      position: 'right' as const,
      customCss: 'color: red',
    }

    expect(hasTooltip(makeField('text', 't', { tooltip: createEmptyTooltip() }))).toBe(false)
    expect(exportableTooltip(makeField('text', 't', { tooltip: filled }))).toEqual({
      content: filled.content,
      position: 'right',
      styles: { color: 'red' },
    })
    expect(exportableTooltip(makeField('textarea', 't', { tooltip: filled }))).toBeUndefined()
  })
})

describe('conceptos', () => {
  it('el tipo de dato sale del tipo de campo; los presentacionales no son concepto', () => {
    expect(conceptKindOf('number')).toBe('numero')
    expect(conceptKindOf('checkbox_group')).toBe('lista')
    expect(conceptKindOf('file')).toBe('archivo')
    expect(conceptKindOf('label')).toBeNull()
  })

  it('el id es un entero positivo que cabe en un int', () => {
    expect(isValidConceptId(1)).toBe(true)
    expect(isValidConceptId(0)).toBe(false)
    expect(isValidConceptId(1.5)).toBe(false)
    expect(isValidConceptId(2_147_483_648)).toBe(false)
    expect(parseConceptId(' 42 ')).toBe(42)
    expect(parseConceptId('4a')).toBeUndefined()
    expect(parseConceptId('-3')).toBeUndefined()
  })

  it('conceptOwners agrupa por id y salta los inválidos', () => {
    const owners = conceptOwners([
      makeField('text', 'a', { apiBinding: { kind: 'concept', idConcepto: 5 } }),
      makeField('number', 'b', { apiBinding: { kind: 'concept', idConcepto: 5 } }),
      makeField('text', 'c', { apiBinding: { kind: 'concept' } }),
      makeField('label', 'd', { apiBinding: { kind: 'concept', idConcepto: 6 } }),
    ])

    expect([...owners.keys()]).toEqual([5])
    expect(owners.get(5)?.map((f) => f.name)).toEqual(['a', 'b'])
  })
})
