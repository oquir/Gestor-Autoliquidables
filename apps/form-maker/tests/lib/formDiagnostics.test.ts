import { afterEach, describe, expect, it, vi } from 'vitest'
import { INDUSTRIA_COMERCIO_INTRO_STEPS } from '../../src/constants/baseTemplate'
import { buildInitialFormSteps, buildInitialIntroSteps } from '../../src/store/formStore.utils'
import { fieldId, makeField, makeGroup, makeRow, makeStep } from '../helpers/canvasFixtures'
import type { CanvasField, FormProblem, FormStep, IntroModalStep } from '../../src/types'
import { diagnoseForm } from '../../src/lib/formDiagnostics/formDiagnostics'
import {
  CONCEPT_IN_GROUP_MESSAGE,
  CYCLE_MESSAGE,
  DUPLICATE_CONCEPT_ID_MESSAGE,
  HOST_MAPPING_MESSAGE,
  INVALID_CONCEPT_ID_MESSAGE,
  INVALID_CONDITION_PATTERN_MESSAGE,
  INVALID_OVERRIDE_PATTERN_MESSAGE,
  INVALID_PATTERN_MESSAGE,
  ORPHAN_MAPPING_MESSAGE,
  PRELUDE_READS_FIELDS_MESSAGE,
  RESERVED_MAPPING_MESSAGE,
  UNSUPPORTED_CSS_MESSAGE,
} from '../../src/lib/formDiagnostics/formDiagnostics.constants'

function diagnose(
  fields: (CanvasField | ReturnType<typeof makeRow>)[],
  options: { formScript?: string; introSteps?: IntroModalStep[]; groups?: FormStep['groups'] } = {},
): FormProblem[] {
  return diagnoseForm({
    formSteps: [makeStep('Paso', fields, options.groups)],
    introSteps: options.introSteps ?? [],
    formScript: options.formScript ?? '',
  })
}

function messages(problems: FormProblem[]): string[] {
  return problems.map((problem) => problem.message)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('diagnoseForm', () => {
  it('el ICA de fábrica sale limpio', () => {
    const problems: FormProblem[] = diagnoseForm({
      formSteps: buildInitialFormSteps('industria_comercio'),
      introSteps: buildInitialIntroSteps('industria_comercio', INDUSTRIA_COMERCIO_INTRO_STEPS),
      formScript: '',
    })

    expect(problems).toEqual([])
  })

  it('el ICA sin el modal de entrada bloquea: el 31 y el 37 leen {{periodo_anio}}', () => {
    const problems: FormProblem[] = diagnoseForm({
      formSteps: buildInitialFormSteps('industria_comercio'),
      introSteps: [],
      formScript: '',
    })

    expect(problems.length).toBeGreaterThan(0)
    expect(problems.every((problem) => problem.severity === 'error')).toBe(true)
    expect(messages(problems).every((message) => message.includes('{{periodo_anio}}'))).toBe(true)
  })

  it('un script con una referencia desconocida, o que no compila', () => {
    const problems: FormProblem[] = diagnose([
      makeField('calculated', 'a', { logic: { script: 'return {{nada}};' } }),
      makeField('calculated', 'b', { logic: { script: 'return (;' } }),
    ])

    expect(messages(problems)[0]).toContain('{{nada}}, que no es un campo')
    expect(messages(problems)[1]).toContain('no compila')
    expect(problems[0].target).toEqual({
      kind: 'field',
      fieldId: fieldId('a'),
      canvas: { type: 'formStep', stepId: 'paso-Paso' },
      tab: 'logic',
    })
  })

  it('el efecto de una regla también se revisa, con su nombre', () => {
    const problems: FormProblem[] = diagnose([
      makeField('number', 'x', {
        logic: {
          rules: [
            {
              id: 'r',
              label: 'Tarifa especial',
              matchAll: true,
              when: [],
              effects: [{ id: 'e', kind: 'script', source: 'return (;' }],
            },
          ],
        },
      }),
    ])

    expect(messages(problems)[0]).toContain('El efecto de la regla «Tarifa especial» no compila')
  })

  it('un preludio que lee campos o no compila es un solo error, no uno por campo', () => {
    const reads: FormProblem[] = diagnose(
      [makeField('calculated', 'a', { logic: { script: 'return 1;' } })],
      { formScript: 'const x = {{a}};' },
    )
    const broken: FormProblem[] = diagnose(
      [
        makeField('calculated', 'a', { logic: { script: 'return 1;' } }),
        makeField('calculated', 'b', { logic: { script: 'return 2;' } }),
      ],
      { formScript: 'const x = ;' },
    )

    expect(messages(reads)).toEqual([`${PRELUDE_READS_FIELDS_MESSAGE} {{a}}`])
    expect(broken).toHaveLength(1)
    expect(broken[0].target).toEqual({ kind: 'prelude' })
  })

  it('un script que choca con el preludio', () => {
    const problems: FormProblem[] = diagnose(
      [makeField('calculated', 'a', { logic: { script: 'const A = 2; return A;' } })],
      { formScript: 'const A = 1;' },
    )

    expect(messages(problems)[0]).toContain('no compila junto con el script del formulario')
  })

  it('regex inválida en el patrón, en un override y en una condición matches', () => {
    const problems: FormProblem[] = diagnose([
      makeField('text', 'a', {
        validations: {
          pattern: '([',
          overrides: [
            {
              id: 'o',
              when: { fieldId: fieldId('b'), operator: 'matches', value: '(' },
              validations: { pattern: '[' },
            },
          ],
        },
      }),
      makeField('text', 'b'),
    ])

    expect(messages(problems).map((message) => message.split(':')[0] + ':')).toEqual([
      INVALID_PATTERN_MESSAGE,
      INVALID_OVERRIDE_PATTERN_MESSAGE,
      INVALID_CONDITION_PATTERN_MESSAGE,
    ])
  })

  it('en un número el patrón no viaja, así que no se revisa', () => {
    expect(diagnose([makeField('number', 'n', { validations: { pattern: '([' } })])).toEqual([])
  })

  it('mapeos huérfanos y a hojas del aplicativo son avisos', () => {
    const problems: FormProblem[] = diagnose([
      makeField('text', 'a', { apiBinding: { kind: 'mapped', path: 'no.existe' } }),
      makeField('text', 'b', {
        apiBinding: { kind: 'mapped', path: 'contribuyente.codigoMunicipio' },
      }),
      makeField('text', 'c', {
        apiBinding: { kind: 'mapped', path: 'contribuyente.numeroDocumento' },
      }),
    ])

    expect(problems.map((problem) => [problem.severity, problem.message])).toEqual([
      ['warning', `${ORPHAN_MAPPING_MESSAGE} no.existe`],
      ['warning', `${HOST_MAPPING_MESSAGE} contribuyente.codigoMunicipio`],
    ])
  })

  it('un mapeo con un tramo reservado es un error, no un aviso de huérfano', () => {
    const problems: FormProblem[] = diagnose([
      makeField('text', 'a', { apiBinding: { kind: 'mapped', path: '__proto__.x' } }),
    ])

    expect(problems.map((problem) => [problem.severity, problem.message])).toEqual([
      ['error', `${RESERVED_MAPPING_MESSAGE} __proto__.x`],
    ])
  })

  it('conceptos sin id, con id repetido o dentro de un grupo', () => {
    const problems: FormProblem[] = diagnose(
      [
        makeField('text', 'sin_id', { apiBinding: { kind: 'concept' } }),
        makeField('text', 'uno', { apiBinding: { kind: 'concept', idConcepto: 5 } }),
        makeField('number', 'otro', { apiBinding: { kind: 'concept', idConcepto: 5 } }),
        makeRow(
          [makeField('text', 'en_grupo', { apiBinding: { kind: 'concept', idConcepto: 6 } })],
          'grupo-g',
        ),
      ],
      { groups: [makeGroup('g')] },
    )
    const texts: string[] = messages(problems)

    expect(texts).toContain(INVALID_CONCEPT_ID_MESSAGE)
    expect(texts.filter((text) => text.startsWith(DUPLICATE_CONCEPT_ID_MESSAGE))).toHaveLength(2)
    expect(texts).toContain(CONCEPT_IN_GROUP_MESSAGE)
  })

  it('un ciclo entre campos se reporta una vez, por nombre', () => {
    const problems: FormProblem[] = diagnose([
      makeField('calculated', 'a', { logic: { script: 'return {{b}};' } }),
      makeField('calculated', 'b', { logic: { script: 'return {{a}};' } }),
    ])

    expect(messages(problems)).toEqual([`${CYCLE_MESSAGE} a → b → a`])
  })

  it('una comprobación de grupo rota, y una apagada no se revisa', () => {
    const problems: FormProblem[] = diagnose([makeRow([makeField('number', 'x')], 'grupo-g')], {
      groups: [
        makeGroup('g', {
          title: 'Actividades',
          checks: [
            { id: 'k1', label: 'Suma', enabled: true, script: 'return (;', message: 'm' },
            { id: 'k2', label: 'Off', enabled: false, script: 'return (;', message: 'm' },
          ],
        }),
      ],
    })

    expect(problems).toHaveLength(1)
    expect(problems[0].where).toBe('Actividades')
    expect(problems[0].message).toContain('La comprobación «Suma»')
  })

  it('CSS que el navegador no reconoce es un aviso, en el campo y en la fila', () => {
    // En node no hay CSS.supports: se simula el del navegador.
    vi.stubGlobal('CSS', { supports: (property: string) => property !== 'colr' })
    const row = makeRow([
      makeField('text', 'a', { styles: { customCss: 'colr: red; color: blue' } }),
    ])
    const problems: FormProblem[] = diagnose([{ ...row, styles: { customCss: 'colr: 1' } }])

    expect(problems.map((problem) => problem.severity)).toEqual(['warning', 'warning'])
    expect(messages(problems)).toEqual([
      `${UNSUPPORTED_CSS_MESSAGE} colr: red`,
      `${UNSUPPORTED_CSS_MESSAGE} colr: 1`,
    ])
  })

  it('los errores van antes que los avisos y cada uno tiene su id', () => {
    const problems: FormProblem[] = diagnose([
      makeField('text', 'a', { apiBinding: { kind: 'mapped', path: 'no.existe' } }),
      makeField('calculated', 'b', { logic: { script: 'return (;' } }),
    ])

    expect(problems.map((problem) => problem.severity)).toEqual(['error', 'warning'])
    expect(problems.map((problem) => problem.id)).toEqual(['problema-0', 'problema-1'])
  })
})
