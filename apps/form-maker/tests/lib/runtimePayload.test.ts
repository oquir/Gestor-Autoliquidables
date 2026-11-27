import { describe, expect, it } from 'vitest'
import {
  fieldId,
  makeField,
  makeGroup,
  makeRow,
  makeStep,
  modelOf,
} from '../helpers/canvasFixtures'
import type { CanvasField, ExportedField, FormStep, RuntimeModel } from '../../src/types'
import type { PreviewState } from '../../src/types'
import { createInitialState, resolveRuntime } from '../../src/lib/formRuntime/formRuntime'
import {
  buildPayload,
  conceptFieldCount,
  mappedFieldCount,
} from '../../src/lib/runtimePayload/runtimePayload'
import {
  conceptEntry,
  parsePath,
  setDeepValue,
} from '../../src/lib/runtimePayload/runtimePayload.utils'

function mapped(type: string, name: string, path: string, extra: Partial<CanvasField> = {}) {
  return makeField(type, name, { apiBinding: { kind: 'mapped', path }, ...extra })
}

function concept(type: string, name: string, idConcepto: number, extra: Partial<CanvasField> = {}) {
  return makeField(type, name, { apiBinding: { kind: 'concept', idConcepto }, ...extra })
}

function payloadOf(
  steps: FormStep[],
  values: Record<string, unknown>,
  groups: Record<string, Record<string, unknown>[]> = {},
): Record<string, unknown> {
  const model: RuntimeModel = modelOf(steps)
  const initial: PreviewState = createInitialState(model)

  return buildPayload(
    model,
    resolveRuntime(model, { values, groups: { ...initial.groups, ...groups } }),
  )
}

describe('setDeepValue y parsePath', () => {
  it('crea los tramos que faltan', () => {
    const target: Record<string, unknown> = {}
    setDeepValue(target, 'contribuyente.idTipoPersona', 2)
    setDeepValue(target, 'contribuyente.numeroDocumento', '900123456')

    expect(target).toEqual({ contribuyente: { idTipoPersona: 2, numeroDocumento: '900123456' } })
  })

  it('un índice rellena el array para que no quede disperso', () => {
    const target: Record<string, unknown> = {}
    setDeepValue(target, 'actividades[2].tarifa', 4)

    expect(target).toEqual({ actividades: [{}, {}, { tarifa: 4 }] })
  })

  it('un tramo reservado no escribe nada ni contamina Object.prototype', () => {
    const target: Record<string, unknown> = {}
    setDeepValue(target, '__proto__.contaminado', 'si')
    setDeepValue(target, 'a.constructor.prototype.contaminado', 'si')
    setDeepValue(target, 'lista[0].__proto__.contaminado', 'si')

    expect(({} as Record<string, unknown>).contaminado).toBeUndefined()
    expect(target).toEqual({})
  })

  it('parsePath separa claves e índices', () => {
    expect(parsePath('a.b[3].c')).toEqual([
      { key: 'a', index: null },
      { key: 'b', index: 3 },
      { key: 'c', index: null },
    ])
    expect(parsePath('')).toEqual([])
  })
})

describe('buildPayload', () => {
  const steps: FormStep[] = [
    makeStep('Datos', [
      mapped('select', 'tipo_persona', 'contribuyente.idTipoPersona'),
      mapped('text', 'documento', 'contribuyente.numeroDocumento'),
      makeField('text', 'sin_mapear'),
      mapped('label', 'rotulo', 'contribuyente.rotulo'),
      mapped('text', 'oculto', 'contribuyente.oculto', {
        visibleWhen: { fieldId: fieldId('tipo_persona'), operator: 'equals', value: '9' },
      }),
    ]),
  ]

  it('solo viaja lo mapeado y visible; ni presentacionales ni sueltos', () => {
    expect(
      payloadOf(steps, {
        tipo_persona: '2',
        documento: '900123456',
        sin_mapear: 'x',
        oculto: 'no',
      }),
    ).toEqual({ contribuyente: { idTipoPersona: '2', numeroDocumento: '900123456' } })
  })

  it('cada fila de un grupo va en su posición del array', () => {
    const grouped: FormStep[] = [
      makeStep(
        'Actividades',
        [
          makeRow(
            [
              mapped('text', 'codigo', 'actividades[].idActividad'),
              mapped('number', 'ingresos', 'actividades[].ingresoGravado'),
            ],
            'grupo-a',
          ),
        ],
        [makeGroup('a', { arrayPath: 'actividades' })],
      ),
    ]

    expect(
      payloadOf(
        grouped,
        {},
        {
          'grupo-a': [
            { codigo: '4711', ingresos: 100 },
            { codigo: '5611', ingresos: 200 },
          ],
        },
      ),
    ).toEqual({
      actividades: [
        { idActividad: '4711', ingresoGravado: 100 },
        { idActividad: '5611', ingresoGravado: 200 },
      ],
    })
  })

  it('una fecha con formato sale en ese formato', () => {
    const dated: FormStep[] = [
      makeStep('Datos', [
        mapped('date', 'cierre', 'fechaCierre', { dateFormat: 'DD/MM/YYYY' }),
        mapped('date', 'sin_formato', 'fechaLibre'),
      ]),
    ]

    expect(payloadOf(dated, { cierre: '2026-03-31', sin_formato: '2026-03-31' })).toEqual({
      fechaCierre: '31/03/2026',
      fechaLibre: '2026-03-31',
    })
  })

  it('los conceptos van en una lista al final, con su tipo', () => {
    const withConcepts: FormStep[] = [
      makeStep('Datos', [
        concept('text', 'nota', 10),
        concept('number', 'monto', 11),
        concept('checkbox', 'acepta', 12),
        concept('checkbox_group', 'servicios', 13, {
          options: [
            { id: 'o1', label: 'Agua' },
            { id: 'o2', label: 'Luz' },
          ],
        }),
        concept('select', 'opcion', 14, { options: [{ id: 'x', label: 'Equis' }] }),
      ]),
    ]

    expect(
      payloadOf(withConcepts, {
        nota: 'hola',
        monto: 5,
        acepta: false,
        servicios: ['o2', 'o1'],
        opcion: 'x',
      }),
    ).toEqual({
      conceptos: [
        { idConcepto: 10, tipo: 'texto', valorTexto: 'hola' },
        { idConcepto: 11, tipo: 'numero', valorNumero: 5 },
        { idConcepto: 12, tipo: 'booleano', valorBooleano: false },
        { idConcepto: 13, tipo: 'lista', valorLista: ['Luz', 'Agua'] },
        { idConcepto: 14, tipo: 'texto', valorTexto: 'Equis' },
      ],
    })
  })

  it('sin conceptos declarados no aparece la clave; sin respuesta, el concepto no viaja', () => {
    expect(payloadOf(steps, {})).not.toHaveProperty('conceptos')
    expect(payloadOf([makeStep('Datos', [concept('text', 'nota', 10)])], {})).toEqual({
      conceptos: [],
    })
  })

  it('cuenta los mapeados y los conceptos', () => {
    const model: RuntimeModel = modelOf([
      makeStep('Datos', [...steps[0].rows.flatMap((row) => row.fields), concept('text', 'c', 1)]),
    ])

    // El rotulo no cuenta: un presentacional no viaja.
    expect(mappedFieldCount(model)).toBe(3)
    expect(conceptFieldCount(model)).toBe(1)
  })
})

describe('conceptEntry', () => {
  const exported = (tipo: string, extra: Partial<ExportedField> = {}): ExportedField =>
    ({
      type: 'text',
      apiBinding: { kind: 'concept', idConcepto: 7, tipo },
      ...extra,
    }) as ExportedField

  it('sin id válido no viaja', () => {
    const field = {
      type: 'text',
      apiBinding: { kind: 'concept', idConcepto: 0, tipo: 'texto' },
    } as ExportedField

    expect(conceptEntry(field, 'x')).toBeNull()
  })

  it('texto en blanco y número no finito no viajan', () => {
    expect(conceptEntry(exported('texto'), '   ')).toBeNull()
    expect(conceptEntry(exported('numero'), Number.NaN)).toBeNull()
    expect(conceptEntry(exported('numero'), '5')).toBeNull()
  })

  it('un archivo viaja con su nombre', () => {
    expect(conceptEntry(exported('archivo'), new File(['x'], 'rut.pdf'))).toEqual({
      idConcepto: 7,
      tipo: 'archivo',
      valorTexto: 'rut.pdf',
    })
    expect(conceptEntry(exported('archivo'), 'rut.pdf')).toBeNull()
  })
})
