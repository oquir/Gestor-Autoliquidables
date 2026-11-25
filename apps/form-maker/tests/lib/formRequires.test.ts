import { describe, expect, it } from 'vitest'
import {
  exportSteps,
  fieldId,
  makeField,
  makeGroup,
  makeRow,
  makeStep,
} from '../helpers/canvasFixtures'
import { buildIcaExport } from '../helpers/runtimeHarness'
import type { CanvasField, FormStep, IntroModalStep } from '../../src/types'

function requiresOf(
  steps: FormStep[],
  options: { formScript?: string; introSteps?: IntroModalStep[] } = {},
) {
  return exportSteps(steps, options).projectMeta.requires
}

function single(field: CanvasField): string[] {
  return requiresOf([makeStep('Paso', [field])])
}

describe('collectRequires', () => {
  it('un campo simple pide solo su tipo', () => {
    expect(single(makeField('text', 'nombre'))).toEqual(['type:text'])
  })

  it('declara cada opción que trae, por clave y por valor', () => {
    const words: string[] = single(
      makeField('date', 'cierre', {
        dateFormat: 'DD/MM/YYYY',
        dateRange: true,
        placeholder: 'x',
        apiBinding: { kind: 'mapped', path: 'fechaCierre' },
        visibleWhen: { fieldId: fieldId('cierre'), operator: 'isNotEmpty' },
      }),
    )

    expect(words).toEqual(
      expect.arrayContaining([
        'type:date',
        'field.dateFormat',
        'dateFormat:DD/MM/YYYY',
        'field.dateRange',
        'binding:mapped',
        'field.visibleWhen',
        'operator:isNotEmpty',
      ]),
    )
    // La fecha no admite placeholder: no viaja y no se pide.
    expect(words).not.toContain('field.placeholder')
  })

  it('los helpers que usa un script, sin falsos positivos por nombres parecidos', () => {
    const words: string[] = single(
      makeField('calculated', 'x', {
        logic: { script: 'const maxima = 1; return uvt() + mesesDeMora(2025) + maxima;' },
      }),
    )

    expect(words).toEqual(
      expect.arrayContaining(['field.logic.script', 'helper:uvt', 'helper:mesesDeMora']),
    )
    expect(words).not.toContain('helper:max')
  })

  it('las reglas, sus efectos y los checks de grupo', () => {
    const words: string[] = requiresOf([
      makeStep(
        'Paso',
        [
          makeRow([makeField('number', 'ingresos')], 'grupo-g'),
          makeField('number', 'tarifa', {
            logic: {
              rules: [
                {
                  id: 'r',
                  matchAll: true,
                  when: [
                    { id: 'c', fieldId: fieldId('ingresos'), operator: 'greaterThan', value: 0 },
                  ],
                  effects: [{ id: 'e', kind: 'constant', value: 1 }],
                },
              ],
            },
          }),
        ],
        [
          makeGroup('g', {
            checks: [
              {
                id: 'k',
                label: 'k',
                enabled: true,
                script: 'return sum({{ingresos}}) > 0;',
                message: 'm',
              },
            ],
          }),
        ],
      ),
    ])

    expect(words).toEqual(
      expect.arrayContaining([
        'field.logic.rules',
        'operator:greaterThan',
        'effect:constant',
        'step.groups',
        'helper:sum',
      ]),
    )
  })

  it('el preludio y el modal de entrada también cuentan', () => {
    const words: string[] = requiresOf([makeStep('Paso', [makeField('text', 'a')])], {
      formScript: 'const UVT = uvt();',
      introSteps: [
        { stepId: 'i', title: 'Intro', rows: [makeRow([makeField('select', 'periodo')])] },
      ],
    })

    expect(words).toEqual(
      expect.arrayContaining([
        'formSchema.prelude',
        'helper:uvt',
        'setupConfig.introModal',
        'type:select',
      ]),
    )
  })

  it('una opción en false no se pide', () => {
    expect(single(makeField('number', 'n', { alwaysDisabled: false }))).toEqual(['type:number'])
    expect(single(makeField('number', 'n', { alwaysDisabled: true }))).toContain(
      'field.alwaysDisabled',
    )
  })

  it('allowsNegative se pide en false, que es el que restringe', () => {
    expect(single(makeField('number', 'n', { allowsNegative: false }))).toContain(
      'field.allowsNegative',
    )
    expect(single(makeField('number', 'n', { allowsNegative: true }))).not.toContain(
      'field.allowsNegative',
    )
  })

  it('sale ordenada y sin repetir', () => {
    const words: string[] = requiresOf([
      makeStep('Paso', [makeField('text', 'a'), makeField('text', 'b'), makeField('number', 'c')]),
    ])

    expect(words).toEqual(['type:number', 'type:text'])
  })

  it('el ICA declara lo que el consumidor tiene que saber hacer', () => {
    const words: string[] = buildIcaExport().projectMeta.requires

    // Lo que hoy le falta al consumidor (ver CLAUDE.md): tiene que aparecer para que lo rechace.
    expect(words).toEqual(
      expect.arrayContaining([
        'type:email',
        'type:tel',
        'field.prefix',
        'field.suffix',
        'helper:mesesDeMora',
        'helper:fechaLimite',
        'helper:uvt',
        'helper:dvNit',
        'step.groups',
        'setupConfig.introModal',
      ]),
    )
    expect([...words].sort()).toEqual(words)
  })
})
