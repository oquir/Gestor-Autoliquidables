import { describe, expect, it } from 'vitest'
import {
  fieldId,
  makeField,
  makeGroup,
  makeRow,
  makeStep,
  modelOf,
} from '../helpers/canvasFixtures'
import type { CanvasField, FormStep, RuntimeContext, RuntimeModel } from '../../src/types'
import type { PreviewState, RuntimeSnapshot } from '../../src/types'
import { createInitialState, resolveRuntime } from '../../src/lib/formRuntime/formRuntime'
import { planDerivedFields } from '../../src/lib/runtimeDerived/runtimeDerived.utils'

function calc(name: string, script: string, overrides: Partial<CanvasField> = {}): CanvasField {
  return makeField('calculated', name, { logic: { script }, ...overrides })
}

function resolve(
  steps: FormStep[],
  values: Record<string, unknown>,
  context?: RuntimeContext,
): RuntimeSnapshot {
  const model: RuntimeModel = modelOf(steps)
  const state: PreviewState = { ...createInitialState(model), values }

  return resolveRuntime(model, state, context)
}

describe('orden de cálculo', () => {
  it('un calculado que lee a otro definido después igual ve su valor', () => {
    // c depende de b, que depende de a; estan al reves en el lienzo.
    const snapshot: RuntimeSnapshot = resolve(
      [
        makeStep('Paso', [
          calc('c', 'return {{b}} * 10;'),
          calc('b', 'return {{a}} + 1;'),
          makeField('number', 'a'),
        ]),
      ],
      { a: 2 },
    )

    expect(snapshot.root.values.b).toBe(3)
    expect(snapshot.root.values.c).toBe(30)
    expect(snapshot.cycle).toBeNull()
  })

  it('planDerivedFields ordena por dependencias y deja fuera lo que no calcula', () => {
    const model: RuntimeModel = modelOf([
      makeStep('Paso', [
        calc('total', 'return {{sub}} + {{iva}};'),
        calc('iva', 'return {{sub}} * 0.19;'),
        calc('sub', 'return {{precio}};'),
        makeField('number', 'precio'),
      ]),
    ])
    const plan = planDerivedFields(model.rootFields)

    expect(plan.order).toEqual(['sub', 'iva', 'total'])
    expect(plan.cycle).toBeNull()
  })

  it('un ciclo se reporta y sus campos no calculan', () => {
    const snapshot: RuntimeSnapshot = resolve(
      [
        makeStep('Paso', [
          calc('a', 'return {{b}} + 1;'),
          calc('b', 'return {{a}} + 1;'),
          calc('libre', 'return 5;'),
        ]),
      ],
      {},
    )

    expect(snapshot.cycle?.sort()).toEqual(['a', 'b'])
    expect(snapshot.root.values.a).toBeUndefined()
    expect(snapshot.root.values.libre).toBe(5)
  })

  it('un campo que se lee a sí mismo no es un ciclo', () => {
    const snapshot: RuntimeSnapshot = resolve(
      [makeStep('Paso', [makeField('number', 'n', { logic: { script: 'return {{n}} * 2;' } })])],
      { n: 4 },
    )

    expect(snapshot.cycle).toBeNull()
    expect(snapshot.root.values.n).toBe(8)
  })
})

describe('resultado de un script', () => {
  it('undefined deja lo escrito y no lo marca como calculado', () => {
    const snapshot: RuntimeSnapshot = resolve(
      [
        makeStep('Paso', [
          makeField('number', 'valor', {
            logic: { script: 'if ({{modo}} !== "auto") return undefined; return 99;' },
          }),
          makeField('text', 'modo'),
        ]),
      ],
      { valor: 12, modo: 'manual' },
    )

    expect(snapshot.root.values.valor).toBe(12)
    expect(snapshot.root.computed.valor).toBeUndefined()
  })

  it('un error de script se reporta y conserva el valor', () => {
    const snapshot: RuntimeSnapshot = resolve(
      [makeStep('Paso', [calc('roto', 'return noExiste();')])],
      { roto: 7 },
    )

    expect(snapshot.root.values.roto).toBe(7)
    expect(snapshot.issues).toEqual([expect.objectContaining({ kind: 'script', field: 'roto' })])
  })

  it('redondea al millar y a los decimales solo lo calculado', () => {
    const snapshot: RuntimeSnapshot = resolve(
      [
        makeStep('Paso', [
          calc('millar', 'return 1499.6;', { rounding: true }),
          calc('decimal', 'return 4.25;', { decimals: 1 }),
          makeField('number', 'escrito', { rounding: true }),
        ]),
      ],
      { escrito: 1499 },
    )

    expect(snapshot.root.values.millar).toBe(1000)
    expect(snapshot.root.values.decimal).toBe(4.3)
    // Lo escrito lo redondea el blur del input, no el runtime.
    expect(snapshot.root.values.escrito).toBe(1499)
  })

  it('si el script deja lo escrito, no lo redondea ni lo recorta', () => {
    // Como el 31 del ICA: con undefined el campo sigue tecleable y lo escrito es del usuario.
    const snapshot: RuntimeSnapshot = resolve(
      [
        makeStep('Paso', [
          makeField('number', 'manual', {
            rounding: true,
            allowsNegative: false,
            logic: { script: 'return undefined;' },
          }),
        ]),
      ],
      { manual: -1499 },
    )

    expect(snapshot.root.values.manual).toBe(-1499)
    expect(snapshot.root.clamped.manual).toBeUndefined()
  })

  it('el que lee un redondeado ve el valor ya redondeado', () => {
    const snapshot: RuntimeSnapshot = resolve(
      [
        makeStep('Paso', [
          calc('base', 'return 1600;', { rounding: true }),
          calc('doble', 'return {{base}} * 2;'),
        ]),
      ],
      {},
    )

    expect(snapshot.root.values.doble).toBe(4000)
  })

  it('sin negativos recorta a 0 y lo marca', () => {
    const snapshot: RuntimeSnapshot = resolve(
      [
        makeStep('Paso', [
          calc('neto', 'return {{a}} - {{b}};', { allowsNegative: false }),
          calc('libre', 'return {{a}} - {{b}};'),
          makeField('number', 'a'),
          makeField('number', 'b'),
        ]),
      ],
      { a: 1, b: 5 },
    )

    expect(snapshot.root.values.neto).toBe(0)
    expect(snapshot.root.clamped.neto).toBe(true)
    expect(snapshot.root.values.libre).toBe(-4)
  })
})

describe('reglas', () => {
  const rulesField: CanvasField = makeField('number', 'tarifa', {
    logic: {
      script: 'return 1;',
      rules: [
        {
          id: 'r1',
          matchAll: true,
          when: [{ id: 'c1', fieldId: fieldId('tipo'), operator: 'equals', value: 'b' }],
          effects: [{ id: 'e1', kind: 'constant', value: 2 }],
        },
        {
          id: 'r2',
          matchAll: true,
          when: [{ id: 'c2', fieldId: fieldId('tipo'), operator: 'equals', value: 'c' }],
          effects: [{ id: 'e2', kind: 'script', source: 'return {{base}} * 3;' }],
        },
      ],
    },
  })
  const steps: FormStep[] = [
    makeStep('Paso', [rulesField, makeField('text', 'tipo'), makeField('number', 'base')]),
  ]

  it('sin regla que aplique queda el script', () => {
    expect(resolve(steps, { tipo: 'a', base: 10 }).root.values.tarifa).toBe(1)
  })

  it('una regla que aplica pisa el valor con su constante', () => {
    expect(resolve(steps, { tipo: 'b', base: 10 }).root.values.tarifa).toBe(2)
  })

  it('una regla con script calcula con los demás campos', () => {
    expect(resolve(steps, { tipo: 'c', base: 10 }).root.values.tarifa).toBe(30)
  })

  // BUG: computeDerivedValues no le pasa el contexto a los scripts de las reglas (runtimeDerived.ts,
  // el runFieldScript de effect.script), asi que dentro de una regla uvt(), fechaLimite() y
  // mesesDeMora() responden como si no hubiera tablas. Pendiente de confirmar con el usuario;
  // it.fails avisa cuando se corrija.
  it.fails('una regla con script ve el contexto (uvt, fechas) como el script del campo', () => {
    const conUvt: FormStep[] = [
      makeStep('Paso', [
        makeField('number', 'minimo', {
          logic: {
            rules: [
              {
                id: 'r1',
                matchAll: true,
                when: [{ id: 'c1', fieldId: fieldId('aplica'), operator: 'isTruthy' }],
                effects: [{ id: 'e1', kind: 'script', source: 'return uvt() * 10;' }],
              },
            ],
          },
        }),
        makeField('checkbox', 'aplica'),
      ]),
    ]
    const context: RuntimeContext = {
      reglas: [],
      hoy: '2026/06/10',
      valores: [{ anio: 2026, uvt: 52374, smmlv: 1750905 }],
    }

    expect(resolve(conUvt, { aplica: true }, context).root.values.minimo).toBe(523740)
  })
})

describe('grupos repetibles', () => {
  const steps: FormStep[] = [
    makeStep(
      'Actividades',
      [
        makeRow(
          [
            makeField('number', 'ingresos'),
            makeField('number', 'tarifa'),
            calc('impuesto', 'return {{ingresos}} * {{tarifa}} / 1000;'),
          ],
          'grupo-actividades',
        ),
        calc('total', 'return sum({{impuesto}});'),
        calc('filas', 'return count({{ingresos}});'),
      ],
      [makeGroup('actividades')],
    ),
  ]

  function resolveGroup(items: Record<string, unknown>[]): RuntimeSnapshot {
    const model: RuntimeModel = modelOf(steps)

    return resolveRuntime(model, { values: {}, groups: { 'grupo-actividades': items } })
  }

  it('cada fila calcula con sus propios valores', () => {
    const snapshot: RuntimeSnapshot = resolveGroup([
      { ingresos: 1_000_000, tarifa: 4 },
      { ingresos: 2_000_000, tarifa: 7 },
    ])

    expect(snapshot.groups['grupo-actividades'].map((row) => row.values.impuesto)).toEqual([
      4000, 14000,
    ])
  })

  it('desde afuera, la columna llega como array para sum y count', () => {
    const snapshot: RuntimeSnapshot = resolveGroup([
      { ingresos: 1_000_000, tarifa: 4 },
      { ingresos: 2_000_000, tarifa: 7 },
    ])

    expect(snapshot.root.values.total).toBe(18000)
    expect(snapshot.root.values.filas).toBe(2)
  })

  it('el grupo arranca con su mínimo de filas', () => {
    const model: RuntimeModel = modelOf([
      makeStep(
        'Paso',
        [makeRow([makeField('number', 'x')], 'grupo-g')],
        [makeGroup('g', { min: 3 })],
      ),
    ])

    expect(createInitialState(model).groups['grupo-g']).toHaveLength(3)
  })
})
