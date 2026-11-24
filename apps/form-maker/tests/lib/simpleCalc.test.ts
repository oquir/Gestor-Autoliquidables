import { describe, expect, it } from 'vitest'
import { fieldId, makeField, makeGroup, makeRow, makeStep } from '../helpers/canvasFixtures'
import type {
  CalcTermIndex,
  CalcTermOptionGroup,
  CanvasField,
  FieldGraph,
  FormStep,
  SimpleCalc,
} from '../../src/types'
import { buildFieldGraph } from '../../src/lib/fieldGraph/fieldGraph'
import {
  buildCalcTermOptions,
  buildSimpleCalcScript,
  indexCalcTermOptions,
  parseSimpleCalcScript,
} from '../../src/lib/simpleCalc/simpleCalc'

const edited: CanvasField = makeField('calculated', 'total', {
  logic: { script: 'return {{a}};' },
})

const steps: FormStep[] = [
  makeStep('Datos', [
    edited,
    makeField('number', 'a', { label: 'Renglón A' }),
    makeField('number', 'b'),
    makeField('text', 'nombre'),
    // Depende del editado: elegirlo cerraria un ciclo.
    makeField('calculated', 'doble', { logic: { script: 'return {{total}} * 2;' } }),
  ]),
  makeStep(
    'Actividades',
    [makeRow([makeField('number', 'impuesto')], 'grupo-actividades')],
    [makeGroup('actividades', { title: 'Actividades' })],
  ),
]

const graph: FieldGraph = buildFieldGraph(
  steps.flatMap((step) => step.rows.flatMap((row) => row.fields)),
)
const groups: CalcTermOptionGroup[] = buildCalcTermOptions(steps, edited, graph)
const index: CalcTermIndex = indexCalcTermOptions(groups)

function calcOf(terms: [string, '+' | '-'][], extra: Partial<SimpleCalc> = {}): SimpleCalc {
  return {
    terms: terms.map(([name, sign]) => ({ sign, fieldId: fieldId(name) })),
    floorAtZero: false,
    multiplier: null,
    ...extra,
  }
}

describe('buildCalcTermOptions', () => {
  it('ofrece los numéricos sin el propio campo, agrupados por paso y grupo', () => {
    expect(groups.map((group) => group.label)).toEqual([
      'Datos',
      'Actividades · Actividades (suma de todas las filas)',
    ])
    expect(groups[0].options.map((option) => option.name)).toEqual(['a', 'b', 'doble'])
  })

  it('marca lo que cerraría un ciclo y lo que llega sumado desde un grupo', () => {
    expect(index.byName.get('doble')?.createsCycle).toBe(true)
    expect(index.byName.get('a')?.createsCycle).toBe(false)
    expect(index.byName.get('impuesto')?.aggregated).toBe(true)
    expect(index.byName.get('a')?.label).toBe('Renglón A')
  })
})

describe('buildSimpleCalcScript', () => {
  it('escribe la suma con signos', () => {
    expect(
      buildSimpleCalcScript(
        calcOf([
          ['a', '+'],
          ['b', '-'],
        ]),
        index,
      ),
    ).toBe('return {{a}} - {{b}};')
    expect(buildSimpleCalcScript(calcOf([['a', '-']]), index)).toBe('return -{{a}};')
  })

  it('una columna de grupo entra con sum()', () => {
    expect(buildSimpleCalcScript(calcOf([['impuesto', '+']]), index)).toBe(
      'return sum({{impuesto}});',
    )
  })

  it('el multiplicador envuelve la suma y el piso va por fuera', () => {
    expect(
      buildSimpleCalcScript(
        calcOf(
          [
            ['a', '+'],
            ['b', '+'],
          ],
          { multiplier: 0.15, floorAtZero: true },
        ),
        index,
      ),
    ).toBe('return max(({{a}} + {{b}}) * 0.15, 0);')
    expect(buildSimpleCalcScript(calcOf([['a', '+']], { multiplier: 2 }), index)).toBe(
      'return {{a}} * 2;',
    )
  })

  it('null si falta algo', () => {
    expect(buildSimpleCalcScript(calcOf([]), index)).toBeNull()
    expect(buildSimpleCalcScript(calcOf([['fantasma', '+']]), index)).toBeNull()
    expect(
      buildSimpleCalcScript(calcOf([['a', '+']], { multiplier: Number.NaN }), index),
    ).toBeNull()
  })
})

describe('parseSimpleCalcScript', () => {
  it('reabre lo que escribió, ida y vuelta', () => {
    const calcs: SimpleCalc[] = [
      calcOf([['a', '+']]),
      calcOf([
        ['a', '-'],
        ['b', '+'],
        ['impuesto', '-'],
      ]),
      calcOf(
        [
          ['a', '+'],
          ['b', '-'],
        ],
        { multiplier: 0.15, floorAtZero: true },
      ),
    ]

    for (const calc of calcs) {
      const script: string | null = buildSimpleCalcScript(calc, index)
      expect(parseSimpleCalcScript(script ?? '', index)).toEqual(calc)
    }
  })

  it('acepta espacios y el punto y coma opcional', () => {
    expect(parseSimpleCalcScript('return   {{ a }}+{{b}}', index)).toEqual(
      calcOf([
        ['a', '+'],
        ['b', '+'],
      ]),
    )
  })

  it('reabre los renglones de la plantilla ICA', () => {
    expect(parseSimpleCalcScript('return {{a}} - {{b}};', index)).not.toBeNull()
  })

  it('cualquier otra cosa no es un cálculo simple', () => {
    expect(parseSimpleCalcScript('return {{a}} * {{b}};', index)).toBeNull()
    expect(parseSimpleCalcScript('return\n{{a}};', index)).toBeNull()
    expect(parseSimpleCalcScript('const x = 1; return {{a}};', index)).toBeNull()
    expect(parseSimpleCalcScript('return {{nombre}};', index)).toBeNull()
    // sum() de un campo suelto no es lo que se escribiria.
    expect(parseSimpleCalcScript('return sum({{a}});', index)).toBeNull()
    expect(parseSimpleCalcScript('return max({{a}}, 1);', index)).toBeNull()
  })
})
