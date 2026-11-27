import { describe, expect, it } from 'vitest'
import {
  exportSteps,
  fieldId,
  makeField,
  makeGroup,
  makeRow,
  makeStep,
} from '../helpers/canvasFixtures'
import type {
  CanvasField,
  ExportedField,
  FormExport,
  FormStep,
  IntroModalStep,
} from '../../src/types'
import { hydrateFieldSchemas } from '../../src/lib/zodHydrate/zodHydrate'
import { buildIcaExport } from '../helpers/runtimeHarness'

function fieldsOf(exported: FormExport): ExportedField[] {
  return [...(exported.setupConfig.introModal?.steps ?? []), ...exported.formSchema.steps].flatMap(
    (step) => step.rows.flatMap((row) => row.fields),
  )
}

function exportedField(steps: FormStep[], name: string): ExportedField {
  const found: ExportedField | undefined = fieldsOf(exportSteps(steps)).find(
    (field) => field.name === name,
  )
  if (!found) throw new Error(`No hay campo ${name}`)

  return found
}

function only(field: CanvasField, ...others: CanvasField[]): FormStep[] {
  return [makeStep('Paso', [field, ...others])]
}

describe('el contrato habla por nombre', () => {
  it('las condiciones, rellenos, labelFor y dependsOn apuntan a nombres, no a ids', () => {
    const steps: FormStep[] = only(
      makeField('text', 'destino', {
        visibleWhen: { fieldId: fieldId('tipo'), operator: 'equals', value: '1' },
        enableWhen: { fieldId: fieldId('tipo'), operator: 'isNotEmpty' },
      }),
      makeField('select', 'tipo', {
        dataSource: {
          catalog: 'ciudades',
          dependsOn: fieldId('depto'),
          fills: [
            { column: 'code', field: fieldId('destino') },
            { column: 'tarifa', field: 'id-borrado' },
          ],
        },
      }),
      makeField('select', 'depto'),
      makeField('label', 'rotulo', { labelFor: fieldId('destino') }),
    )

    expect(exportedField(steps, 'destino').visibleWhen).toEqual({
      field: 'tipo',
      operator: 'equals',
      value: '1',
    })
    expect(exportedField(steps, 'destino').enableWhen?.field).toBe('tipo')
    // El relleno a un campo borrado se descarta.
    expect(exportedField(steps, 'tipo').dataSource).toEqual({
      catalog: 'ciudades',
      dependsOn: 'depto',
      fills: [{ column: 'code', field: 'destino' }],
    })
    expect(exportedField(steps, 'rotulo').labelFor).toBe('destino')
  })

  it('el operador in sale como lista', () => {
    const field: ExportedField = exportedField(
      only(
        makeField('text', 'x', {
          visibleWhen: { fieldId: fieldId('y'), operator: 'in', value: '1, 2 ,3' },
        }),
        makeField('text', 'y'),
      ),
      'x',
    )

    expect(field.visibleWhen?.value).toEqual(['1', '2', '3'])
  })

  it('una validación condicional que apunta a un campo borrado se descarta', () => {
    const field: ExportedField = exportedField(
      only(
        makeField('text', 'doc', {
          validations: {
            required: true,
            overrides: [
              {
                id: 'o1',
                when: { fieldId: 'id-borrado', operator: 'equals', value: '2' },
                validations: { pattern: '^\\d+$' },
              },
              {
                id: 'o2',
                when: { fieldId: fieldId('tipo'), operator: 'equals', value: '2' },
                validations: { pattern: '^\\d{9}$' },
              },
            ],
          },
        }),
        makeField('select', 'tipo'),
      ),
      'doc',
    )

    expect(field.validations.zodSchemaWhen).toHaveLength(1)
    expect(field.validations.zodSchemaWhen?.[0].when.field).toBe('tipo')
  })
})

describe('scripts y reglas', () => {
  it('el script se compila y declara lo que lee', () => {
    const field: ExportedField = exportedField(
      only(
        makeField('calculated', 'total', { logic: { script: 'return {{a}} + 1;' } }),
        makeField('number', 'a'),
      ),
      'total',
    )

    expect(field.logic.script).toEqual({
      source: 'return {{a}} + 1;',
      compiled: 'return __v["a"] + 1;',
      reads: ['a'],
    })
  })

  it('un script vacío o de un presentacional no viaja', () => {
    expect(
      exportedField(only(makeField('number', 'n', { logic: { script: '  ' } })), 'n').logic.script,
    ).toBeUndefined()
    expect(
      exportedField(only(makeField('label', 'r', { logic: { script: 'return 1;' } })), 'r').logic
        .script,
    ).toBeUndefined()
    expect(exportedField(only(makeField('label', 'r')), 'r').validations).toEqual({})
  })

  it('el efecto de script de una regla sale compilado y la constante tal cual', () => {
    const field: ExportedField = exportedField(
      only(
        makeField('number', 'tarifa', {
          logic: {
            rules: [
              {
                id: 'r1',
                matchAll: false,
                when: [{ id: 'c', fieldId: fieldId('tipo'), operator: 'equals', value: 'a' }],
                effects: [
                  { id: 'e1', kind: 'constant', value: 4 },
                  { id: 'e2', kind: 'script', source: 'return {{tipo}};' },
                ],
              },
            ],
          },
        }),
        makeField('text', 'tipo'),
      ),
      'tarifa',
    )

    expect(field.logic.rules?.[0].when[0].field).toBe('tipo')
    expect(field.logic.rules?.[0].effects).toEqual([
      { id: 'e1', kind: 'constant', value: 4 },
      {
        id: 'e2',
        kind: 'script',
        script: { source: 'return {{tipo}};', compiled: 'return __v["tipo"];', reads: ['tipo'] },
      },
    ])
  })
})

describe('lo que solo viaja si aplica', () => {
  it('las opciones a mano solo en un campo no mapeado', () => {
    const options = [{ id: 'a', label: 'A' }]

    expect(
      exportedField(
        only(makeField('select', 's', { apiBinding: { kind: 'excluded' }, options })),
        's',
      ).options,
    ).toEqual(options)
    expect(
      exportedField(
        only(makeField('select', 's', { apiBinding: { kind: 'mapped', path: 'x' }, options })),
        's',
      ).options,
    ).toBeUndefined()
  })

  it('un concepto lleva el tipo de dato de su campo; un presentacional no sale como concepto', () => {
    expect(
      exportedField(
        only(makeField('number', 'n', { apiBinding: { kind: 'concept', idConcepto: 3 } })),
        'n',
      ).apiBinding,
    ).toEqual({ kind: 'concept', idConcepto: 3, tipo: 'numero' })
    expect(
      exportedField(
        only(makeField('label', 'r', { apiBinding: { kind: 'concept', idConcepto: 3 } })),
        'r',
      ).apiBinding,
    ).toBeUndefined()
  })

  it('redondeo, formato y signo solo en los numéricos', () => {
    const number: ExportedField = exportedField(
      only(
        makeField('number', 'n', {
          rounding: true,
          formatted: true,
          allowsNegative: false,
          decimals: 0,
        }),
      ),
      'n',
    )
    const text: ExportedField = exportedField(
      only(makeField('text', 't', { rounding: true, formatted: true, allowsNegative: false })),
      't',
    )

    expect([number.rounding, number.formatted, number.allowsNegative, number.decimals]).toEqual([
      true,
      true,
      false,
      0,
    ])
    expect([text.rounding, text.formatted, text.allowsNegative]).toEqual([
      undefined,
      undefined,
      undefined,
    ])
  })

  it('una comprobación apagada no viaja', () => {
    const exported: FormExport = exportSteps([
      makeStep(
        'Paso',
        [makeRow([makeField('number', 'x')], 'grupo-g')],
        [
          makeGroup('g', {
            arrayPath: 'items',
            checks: [
              { id: 'on', label: 'On', enabled: true, script: 'return true;', message: 'm' },
              { id: 'off', label: 'Off', enabled: false, script: 'return true;', message: 'm' },
            ],
          }),
        ],
      ),
    ])
    const group = exported.formSchema.steps[0].groups?.[0]

    expect(group?.checks?.map((check) => check.id)).toEqual(['on'])
    expect(group?.arrayPath).toBe('items')
    expect(group?.zodSchema).toContain('z.array(')
  })

  it('un paso oculto se marca y uno visible no lleva la clave', () => {
    const exported: FormExport = exportSteps([
      { ...makeStep('Visible', [makeField('text', 'a')]) },
      { ...makeStep('Oculto', [makeField('text', 'b')]), hidden: true },
    ])

    expect(exported.formSchema.steps.map((step) => step.hidden)).toEqual([undefined, true])
  })
})

describe('el documento completo', () => {
  it('el modal de entrada se decide por sus pasos, no por la bandera', () => {
    const intro: IntroModalStep[] = [
      { stepId: 'i1', title: 'Intro', rows: [makeRow([makeField('select', 'periodo')])] },
    ]

    expect(exportSteps([makeStep('Paso', [])], { introSteps: intro }).setupConfig).toMatchObject({
      hasIntroModal: true,
      introModal: { steps: [expect.objectContaining({ title: 'Intro' })] },
    })
    expect(exportSteps([makeStep('Paso', [])]).setupConfig).toEqual({
      hasIntroModal: false,
      introModal: undefined,
    })
  })

  it('el preludio viaja recortado y solo si tiene algo', () => {
    expect(
      exportSteps([makeStep('Paso', [])], { formScript: '  const A = 1;  ' }).formSchema.prelude,
    ).toBe('const A = 1;')
    expect(exportSteps([makeStep('Paso', [])], { formScript: '   ' }).formSchema.prelude).toBe(
      undefined,
    )
  })

  it('no viaja ningún uuid del builder fuera de los ids propios', () => {
    // Del ICA de fabrica: ninguna referencia (condicion, labelFor, relleno) queda con un id.
    const exported: FormExport = buildIcaExport()
    const fields: ExportedField[] = fieldsOf(exported)
    const ids: Set<string> = new Set(fields.map((field) => field.fieldId))
    const references: string[] = fields.flatMap((field) => [
      ...(field.visibleWhen ? [field.visibleWhen.field] : []),
      ...(field.enableWhen ? [field.enableWhen.field] : []),
      ...(field.labelFor ? [field.labelFor] : []),
      ...(field.dataSource?.dependsOn ? [field.dataSource.dependsOn] : []),
      ...(field.dataSource?.fills ?? []).map((fill) => fill.field),
      ...(field.validations.zodSchemaWhen ?? []).map((variant) => variant.when.field),
    ])

    expect(references.length).toBeGreaterThan(0)
    expect(references.filter((reference) => ids.has(reference))).toEqual([])
  })

  it('cada schema del ICA hidrata y los nombres no se repiten', () => {
    const fields: ExportedField[] = fieldsOf(buildIcaExport())
    const names: string[] = fields.map((field) => field.name)

    expect(new Set(names).size).toBe(names.length)
    // Por el camino del consumidor: compilar la funcion sin llamarla con z no probaba nada
    // (z.noExiste() pasaba).
    const { schemas, issues } = hydrateFieldSchemas(fields)
    expect(issues).toEqual([])
    expect(schemas.size).toBeGreaterThan(0)
  })
})
