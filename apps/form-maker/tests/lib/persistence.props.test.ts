import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { RESERVED_FIELD_NAMES } from '../../src/lib/fieldName/fieldName.constants'
import { parseDraft } from '../../src/lib/persistence/persistence'
import { DRAFT_SCHEMA_VERSION } from '../../src/lib/persistence/persistence.constants'
import type { CanvasField, DraftLoad, DraftPayload } from '../../src/types'

// Pruebas por propiedades de la carga del borrador (ver numberFormat.props.test.ts): complementan
// persistence.test.ts. El borrador llega de localStorage o de un archivo, que alguien pudo editar.

type Loose = Record<string, unknown>

// Nombres que chocan entre si o con el prototipo, vacios, con acentos o con digito inicial.
const FIELD_NAME: fc.Arbitrary<string> = fc.constantFrom(
  'base',
  'base',
  'base_2',
  'total',
  '',
  'constructor',
  '__proto__',
  'toString',
  'prototype',
  'año',
  '1er',
)

function field(name: string, index: number): Loose {
  return {
    id: `id-${index}`,
    type: 'number',
    label: `Campo ${index}`,
    name,
    colStart: 0,
    colSpan: 4,
    validations: {},
    styles: {},
    logic: {},
  }
}

function stepWith(names: string[], offset: number, stepId: string): Loose {
  return {
    stepId,
    title: stepId,
    rows: [
      {
        id: `fila-${stepId}`,
        columns: 16,
        fields: names.map((name: string, index: number) => field(name, offset + index)),
      },
    ],
  }
}

function draftWith(formNames: string[], introNames: string[]): Loose {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    formSteps: [stepWith(formNames, 0, 'paso-1')],
    introModal: { steps: introNames.length > 0 ? [stepWith(introNames, 100, 'intro-1')] : [] },
    setupConfig: {
      isComplete: true,
      formType: 'industria_comercio',
      hasIntroModal: introNames.length > 0,
      introModalSteps: introNames.length > 0 ? 1 : 0,
    },
    formScript: '',
    savedAt: '2026-01-01T00:00:00.000Z',
  }
}

function namesOf(draft: DraftPayload): string[] {
  const fields: CanvasField[] = [...draft.formSteps, ...draft.introModal.steps].flatMap((step) =>
    step.rows.flatMap((row) => row.fields),
  )
  return fields.map((candidate: CanvasField) => candidate.name)
}

describe('parseDraft (propiedades)', () => {
  it('nunca lanza con cualquier valor: da ok o invalid', () => {
    fc.assert(
      fc.property(fc.anything(), (stored: unknown) => {
        expect(['ok', 'invalid']).toContain(parseDraft(stored).status)
      }),
    )
  })

  it('nunca lanza si a un borrador bueno se le cambia cualquier llave por cualquier cosa', () => {
    const keys: string[] = Object.keys(draftWith(['base'], []))

    fc.assert(
      fc.property(fc.constantFrom(...keys), fc.jsonValue(), (key: string, value: unknown) => {
        const stored: Loose = { ...draftWith(['base'], []), [key]: value }

        expect(['ok', 'invalid']).toContain(parseDraft(stored).status)
      }),
    )
  })

  it('al abrir, los nombres de los dos lienzos son únicos, no vacíos y no reservados', () => {
    fc.assert(
      fc.property(
        fc.array(FIELD_NAME, { minLength: 1, maxLength: 8 }),
        fc.array(FIELD_NAME, { maxLength: 4 }),
        (formNames: string[], introNames: string[]) => {
          const load: DraftLoad = parseDraft(draftWith(formNames, introNames))
          if (load.status !== 'ok') throw new Error(`El borrador no abrio: ${load.status}`)

          const names: string[] = namesOf(load.draft)

          expect(new Set(names).size).toBe(names.length)
          for (const name of names) {
            expect(name).not.toBe('')
            expect(RESERVED_FIELD_NAMES.has(name)).toBe(false)
          }
        },
      ),
    )
  })

  it('cada nombre que cambia, salvo uno que faltaba, se reporta en renamed', () => {
    fc.assert(
      fc.property(fc.array(FIELD_NAME, { minLength: 1, maxLength: 8 }), (formNames: string[]) => {
        const load: DraftLoad = parseDraft(draftWith(formNames, []))
        if (load.status !== 'ok') throw new Error(`El borrador no abrio: ${load.status}`)

        const after: string[] = namesOf(load.draft)
        const changed: number = formNames.filter(
          (name: string, index: number) => name !== '' && name !== after[index],
        ).length

        expect(load.renamed).toHaveLength(changed)
      }),
    )
  })
})
