import { describe, expect, it } from 'vitest'
import { dependencyCandidates } from '../../src/lib/fieldCandidates/fieldCandidates'
import { pruneDataSourceReferencing } from '../../src/lib/fieldDataSource/fieldDataSource'
import {
  collectRuleRefs,
  createConstantEffect,
  createFieldRule,
  createScriptEffect,
  moveRule,
  pruneRulesReferencing,
  ruleScriptSources,
} from '../../src/lib/fieldRule/fieldRule'
import {
  createValidationOverride,
  pruneOverridesReferencing,
} from '../../src/lib/fieldValidationOverride/fieldValidationOverride'
import type { FieldDataSource, FieldRule, FieldValidationOverride } from '../../src/types'
import { makeField, makeRow, makeStep } from '../helpers/canvasFixtures'

// Lo que se limpia cuando se borra un campo: cada referencia por id que podria quedar colgando.

function rule(id: string, fieldIds: string[]): FieldRule {
  return {
    id,
    matchAll: true,
    when: fieldIds.map((fieldId, index) => ({
      id: `${id}-${index}`,
      fieldId,
      operator: 'isTruthy',
    })),
    effects: [{ id: `${id}-e`, kind: 'script', source: `return ${index(id)};` }],
  }
}

function index(id: string): number {
  return Number(id.replace(/\D/g, '')) || 0
}

describe('reglas', () => {
  it('nacen vacías, con matchAll y un id propio', () => {
    const created: FieldRule = createFieldRule()

    expect(created).toMatchObject({ matchAll: true, when: [], effects: [] })
    expect(created.id).not.toBe(createFieldRule().id)
    expect(createScriptEffect()).toMatchObject({ kind: 'script', source: '' })
    expect(createConstantEffect()).toMatchObject({ kind: 'constant', value: '' })
  })

  it('moveRule reordena y no se sale de los bordes', () => {
    const rules: FieldRule[] = [rule('r1', []), rule('r2', []), rule('r3', [])]

    expect(moveRule(rules, 'r3', -1).map((r) => r.id)).toEqual(['r1', 'r3', 'r2'])
    expect(moveRule(rules, 'r1', -1)).toBe(rules)
    expect(moveRule(rules, 'r3', 1)).toBe(rules)
    expect(moveRule(rules, 'nada', 1)).toBe(rules)
  })

  it('al borrar un campo, la regla pierde esa condición; sin condiciones se descarta', () => {
    const rules: FieldRule[] = [rule('r1', ['a', 'b']), rule('r2', ['a']), rule('r3', ['c'])]
    const pruned: FieldRule[] | undefined = pruneRulesReferencing(rules, 'a')

    expect(pruned?.map((r) => [r.id, r.when.map((w) => w.fieldId)])).toEqual([
      ['r1', ['b']],
      ['r3', ['c']],
    ])
    // La que no tocaba el campo queda como el mismo objeto.
    expect(pruned?.[1]).toBe(rules[2])
    expect(pruneRulesReferencing(undefined, 'a')).toBeUndefined()
  })

  it('collectRuleRefs y ruleScriptSources juntan sin repetir', () => {
    const rules: FieldRule[] = [rule('r1', ['a', 'b']), rule('r2', ['a'])]

    expect(collectRuleRefs(rules)).toEqual(['a', 'b'])
    expect(ruleScriptSources(rules)).toEqual(['return 1;', 'return 2;'])
    expect(collectRuleRefs(undefined)).toEqual([])
  })
})

describe('validaciones condicionales', () => {
  it('nacen sin campo observado', () => {
    expect(createValidationOverride().when).toEqual({ fieldId: '', operator: 'equals', value: '' })
  })

  it('al borrar el campo observado, el override se va entero', () => {
    const overrides: FieldValidationOverride[] = [
      { id: 'o1', when: { fieldId: 'a', operator: 'equals', value: '1' }, validations: {} },
      { id: 'o2', when: { fieldId: 'b', operator: 'equals', value: '1' }, validations: {} },
    ]

    expect(pruneOverridesReferencing(overrides, 'a')?.map((o) => o.id)).toEqual(['o2'])
    expect(pruneOverridesReferencing(undefined, 'a')).toBeUndefined()
  })
})

describe('catálogos', () => {
  const source: FieldDataSource = {
    catalog: 'municipios',
    dependsOn: 'depto',
    fills: [
      { column: 'code', field: 'codigo' },
      { column: 'tarifa', field: 'tarifa' },
    ],
  }

  it('al borrar el padre se pierde el filtro, no el catálogo', () => {
    expect(pruneDataSourceReferencing(source, 'depto')).toEqual({
      catalog: 'municipios',
      dependsOn: undefined,
      fills: source.fills,
    })
  })

  it('al borrar un destino de relleno se va ese relleno; sin rellenos, la clave', () => {
    expect(pruneDataSourceReferencing(source, 'codigo')?.fills).toEqual([
      { column: 'tarifa', field: 'tarifa' },
    ])
    expect(
      pruneDataSourceReferencing({ catalog: 'x', fills: [{ column: 'code', field: 'c' }] }, 'c'),
    ).toEqual({ catalog: 'x', dependsOn: undefined, fills: undefined })
  })

  it('si no lo nombra, el mismo objeto', () => {
    expect(pruneDataSourceReferencing(source, 'otro')).toBe(source)
    expect(pruneDataSourceReferencing(undefined, 'otro')).toBeUndefined()
  })
})

describe('dependencyCandidates', () => {
  const intro = [{ stepId: 'i', title: 'Intro', rows: [makeRow([makeField('select', 'periodo')])] }]
  const steps = [
    makeStep('Paso', [
      makeField('text', 'nombre'),
      makeField('label', 'rotulo'),
      makeField('number', 'monto'),
    ]),
  ]

  it('un campo del formulario ve el modal primero y después el formulario, sin sí mismo', () => {
    expect(dependencyCandidates('id-monto', steps, intro).map((f) => f.name)).toEqual([
      'periodo',
      'nombre',
    ])
  })

  it('uno del modal solo ve el modal', () => {
    const introWithTwo = [
      {
        stepId: 'i',
        title: 'Intro',
        rows: [makeRow([makeField('select', 'periodo'), makeField('select', 'tipo')])],
      },
    ]

    expect(dependencyCandidates('id-tipo', steps, introWithTwo).map((f) => f.name)).toEqual([
      'periodo',
    ])
  })
})
