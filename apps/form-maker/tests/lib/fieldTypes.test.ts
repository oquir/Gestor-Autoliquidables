import { describe, expect, it } from 'vitest'
import { FIELD_TYPES } from '../../src/constants/fieldTypes'
import { fieldId, makeField, makeGroup, makeRow, makeStep } from '../helpers/canvasFixtures'
import { runPipeline, type PipelineResult } from '../helpers/runtimeHarness'
import type {
  CanvasField,
  ExportedField,
  FormStep,
  FormType,
  RichTextContent,
} from '../../src/types'

// Cada tipo de campo de la paleta, de punta a punta: el builder lo exporta, el runtime del
// consumidor lo valida, lo muestra u oculta, y lo manda al payload. Si un tipo nuevo entra a la
// paleta sin caso aca, la primera prueba falla.

interface TypeCase {
  type: string
  extra?: Partial<CanvasField>
  // Pasa la validacion y es lo que llega al payload (salvo que payload diga otra cosa).
  good: unknown
  payload?: unknown
  // Lleno pero invalido; ausente si el tipo no tiene un valor asi.
  bad?: unknown
  // El mensaje que tiene que dar bad: sin el, un error por otra regla tambien pasaria.
  badError?: RegExp
}

// Lo que dice zod cuando falta el valor; no el de un patron o un rango.
const MISSING_VALUE: RegExp = /^(Invalid input|Too small: expected array to have >=1)/

const SMALL_FILE: File = new File(['rut'], 'rut.pdf', { type: 'application/pdf' })

const BIG_FILE: File = new File([new Uint8Array(2 * 1024 * 1024)], 'grande.pdf', {
  type: 'application/pdf',
})

const INPUT_CASES: TypeCase[] = [
  {
    type: 'text',
    extra: { validations: { pattern: '^[A-Z]+$' } },
    good: 'ABC',
    bad: 'abc',
    badError: /^Invalid string: must match pattern/,
  },
  {
    type: 'textarea',
    extra: { validations: { maxLength: 5 } },
    good: 'hola',
    bad: 'demasiado',
    badError: /^Too big: expected string to have <=5/,
  },
  {
    type: 'number',
    extra: { validations: { min: 0 } },
    good: 1500,
    bad: -1,
    badError: /^Too small: expected number to be >=0/,
  },
  { type: 'tel', good: '3001234567', bad: '12345', badError: /^Ingrese un celular válido/ },
  { type: 'email', good: 'ana@empresa.co', bad: 'ana@', badError: /^Ingrese un correo válido$/ },
  { type: 'date', good: '2026-03-31', bad: '31/03/2026', badError: /^Fecha inválida$/ },
  {
    type: 'datalist',
    extra: { validations: { maxLength: 10 } },
    good: 'Bogotá',
    bad: 'muy largo de verdad',
    badError: /^Too big: expected string to have <=10/,
  },
  { type: 'select', good: '2' },
  { type: 'search_select', good: '4711' },
  { type: 'toggle_group', good: '7' },
  { type: 'radio_group', good: '1' },
  { type: 'checkbox_group', good: ['1', '3'] },
  {
    type: 'file',
    extra: { fileConfig: { acceptedFormats: ['.pdf'], maxSizeMB: 1 } },
    good: SMALL_FILE,
    bad: BIG_FILE,
    badError: /^Máximo 1MB$/,
  },
]

// El campo bajo prueba es obligatorio, va mapeado a "campo" y solo se ve si control vale "ver".
function formWith(testCase: TypeCase, extra: Partial<CanvasField> = {}): FormStep[] {
  return [
    makeStep('Paso', [
      makeField('text', 'control'),
      makeField(testCase.type, 'campo', {
        apiBinding: { kind: 'mapped', path: 'campo' },
        visibleWhen: { fieldId: fieldId('control'), operator: 'equals', value: 'ver' },
        ...testCase.extra,
        ...extra,
        validations: { required: true, ...testCase.extra?.validations, ...extra.validations },
      }),
    ]),
  ]
}

function run(testCase: TypeCase, value: unknown, control: string = 'ver'): PipelineResult {
  return runPipeline(formWith(testCase), { control, campo: value })
}

function exportedCampo(result: PipelineResult): ExportedField {
  const field: ExportedField | undefined = result.model.fieldsByName.get('campo')
  if (!field) throw new Error('El campo no llego al modelo')

  return field
}

describe('la paleta', () => {
  it('cada tipo de la paleta tiene su caso en esta prueba', () => {
    const covered: string[] = [
      ...INPUT_CASES.map((testCase) => testCase.type),
      'checkbox',
      'calculated',
      'label',
      'rich_text',
    ]

    expect([...covered].sort()).toEqual(FIELD_TYPES.map((definition) => definition.type).sort())
  })
})

describe.each(INPUT_CASES)('$type de punta a punta', (testCase) => {
  it('se exporta con su tipo y lo pide en requires', () => {
    const result: PipelineResult = run(testCase, testCase.good)

    expect(exportedCampo(result).type).toBe(testCase.type)
    expect(result.exported.projectMeta.requires).toContain(`type:${testCase.type}`)
  })

  it('obligatorio y vacío da error', () => {
    const empty: unknown = testCase.type === 'checkbox_group' ? [] : undefined

    expect(run(testCase, empty).validation.errors.campo).toMatch(MISSING_VALUE)
  })

  it('un valor bueno pasa y llega al payload', () => {
    const result: PipelineResult = run(testCase, testCase.good)

    expect(result.validation.errors).toEqual({})
    expect(result.payload).toEqual({ campo: testCase.payload ?? testCase.good })
  })

  it('oculto, ni se valida ni viaja', () => {
    const result: PipelineResult = run(testCase, testCase.bad ?? undefined, 'no')

    expect(result.snapshot.root.visible.campo).toBe(false)
    expect(result.validation.errors).toEqual({})
    expect(result.payload).toEqual({})
  })

  // Con un valor que si viajaria si se viera: undefined no prueba que el oculto se filtre.
  it('oculto con un valor bueno tampoco viaja', () => {
    expect(run(testCase, testCase.good, 'no').payload).toEqual({})
  })

  it('enableWhen lo deshabilita sin ocultarlo', () => {
    const steps: FormStep[] = formWith(testCase, {
      visibleWhen: undefined,
      enableWhen: { fieldId: fieldId('control'), operator: 'equals', value: 'editar' },
    })

    expect(runPipeline(steps, { control: 'x' }).snapshot.root.disabled.campo).toBe(true)
    expect(runPipeline(steps, { control: 'editar' }).snapshot.root.disabled.campo).toBe(false)
  })
})

// Los de opciones con catalogo no tienen un valor invalido: el schema es texto y las opciones las
// pone el catalogo. Las opciones a mano se prueban mas abajo.
describe.each(INPUT_CASES.filter((testCase) => testCase.bad !== undefined))(
  '$type rechaza un valor inválido',
  (testCase) => {
    it('lleno pero inválido da error', () => {
      expect(run(testCase, testCase.bad).validation.errors.campo).toMatch(testCase.badError ?? /^$/)
    })
  },
)

describe('checkbox', () => {
  const steps: FormStep[] = [
    makeStep('Paso', [
      makeField('checkbox', 'acepta', {
        validations: { required: true },
        apiBinding: { kind: 'mapped', path: 'acepta' },
      }),
    ]),
  ]

  it('es un booleano: nunca queda obligatorio por vacío', () => {
    expect(runPipeline(steps, {}).validation.errors).toEqual({})
  })

  it('marcado llega como true y pide su tipo', () => {
    const result: PipelineResult = runPipeline(steps, { acepta: true })

    expect(result.payload).toEqual({ acepta: true })
    expect(result.exported.projectMeta.requires).toContain('type:checkbox')
  })
})

describe('calculated', () => {
  const steps: FormStep[] = [
    makeStep('Paso', [
      makeField('number', 'base'),
      makeField('calculated', 'doble', {
        alwaysDisabled: true,
        rounding: true,
        apiBinding: { kind: 'mapped', path: 'doble' },
        validations: { max: 10_000 },
        logic: { script: 'return {{base}} * 2;' },
      }),
    ]),
  ]

  it('calcula, redondea, queda de solo lectura y llega al payload', () => {
    const result: PipelineResult = runPipeline(steps, { base: 1300 })

    expect(result.snapshot.root.values.doble).toBe(3000)
    expect(result.snapshot.root.computed.doble).toBe(true)
    expect(result.snapshot.root.disabled.doble).toBe(true)
    expect(result.payload).toEqual({ doble: 3000 })
  })

  it('su resultado también se valida', () => {
    expect(runPipeline(steps, { base: 6000 }).validation.errors.doble).toBeDefined()
  })
})

describe('label y rich_text', () => {
  const content: RichTextContent = [
    { type: 'paragraph', children: [{ text: 'Lea ' }, { text: 'esto', bold: true }] },
  ]
  const steps: FormStep[] = [
    makeStep('Paso', [
      makeField('text', 'control'),
      makeRow([
        makeField('label', 'rotulo', {
          labelFor: fieldId('destino'),
          validations: { required: true },
          apiBinding: { kind: 'mapped', path: 'rotulo' },
        }),
        makeField('text', 'destino', {
          visibleWhen: { fieldId: fieldId('control'), operator: 'equals', value: 'ver' },
        }),
      ]),
      makeField('rich_text', 'nota', {
        content,
        validations: { required: true },
        apiBinding: { kind: 'mapped', path: 'nota' },
      }),
    ]),
  ]

  it('no validan ni viajan en el payload aunque estén mapeados', () => {
    const result: PipelineResult = runPipeline(steps, { control: 'ver' })

    expect(result.validation.errors).toEqual({})
    expect(result.payload).toEqual({})
  })

  it('el texto con formato viaja con su contenido y declara sus marcas', () => {
    const result: PipelineResult = runPipeline(steps, {})
    const nota: ExportedField | undefined = result.model.fieldsByName.get('nota')

    expect(nota?.content).toEqual(content)
    expect(nota?.validations).toEqual({})
    expect(result.exported.projectMeta.requires).toEqual(
      expect.arrayContaining(['type:label', 'type:rich_text', 'richText.bold']),
    )
  })

  it('la etiqueta se oculta con el campo al que apunta', () => {
    expect(runPipeline(steps, { control: 'no' }).snapshot.root.visible.rotulo).toBe(false)
    expect(runPipeline(steps, { control: 'ver' }).snapshot.root.visible.rotulo).toBe(true)
    expect(runPipeline(steps, {}).model.externalLabels.get('destino')).toBe('rotulo')
  })
})

describe('opciones a mano', () => {
  // Sin catalogo: el schema enumera los ids, y como concepto viaja el texto de la opcion.
  const OPTION_TYPES: string[] = [
    'select',
    'search_select',
    'toggle_group',
    'radio_group',
    'checkbox_group',
  ]

  describe.each(OPTION_TYPES)('%s', (type) => {
    const multi: boolean = type === 'checkbox_group'
    const steps: FormStep[] = [
      makeStep('Paso', [
        makeField(type, 'opcion', {
          validations: { required: true },
          apiBinding: { kind: 'concept', idConcepto: 21 },
          options: [
            { id: 'a', label: 'Alfa' },
            { id: 'b', label: 'Beta' },
          ],
        }),
      ]),
    ]
    const good: unknown = multi ? ['b'] : 'b'
    const bad: unknown = multi ? ['z'] : 'z'

    it('una opción que no existe da error', () => {
      expect(runPipeline(steps, { opcion: bad }).validation.errors.opcion).toBeDefined()
    })

    it('una que existe pasa y viaja con su texto', () => {
      const result: PipelineResult = runPipeline(steps, { opcion: good })

      expect(result.validation.errors).toEqual({})
      expect(result.payload).toEqual({
        conceptos: [
          multi
            ? { idConcepto: 21, tipo: 'lista', valorLista: ['Beta'] }
            : { idConcepto: 21, tipo: 'texto', valorTexto: 'Beta' },
        ],
      })
    })
  })
})

describe('opciones de presentación: solo viajan en los tipos que las admiten', () => {
  const content: RichTextContent = [{ type: 'paragraph', children: [{ text: 'Ayuda' }] }]
  const everything: Partial<CanvasField> = {
    prefix: ' $ ',
    suffix: 'kW ',
    placeholder: '  Escriba  ',
    suggestions: [' Bogotá', 'Cali', '', 'Bogotá'],
    tooltip: { content, position: 'top' },
    inlineOptions: true,
    dateFormat: 'DD/MM/YYYY',
    dateRange: true,
    includesTime: true,
    validations: { maxLength: 8 },
  }

  function exportedAs(type: string): ExportedField {
    const result: PipelineResult = runPipeline(
      [makeStep('Paso', [makeField(type, 'campo', everything)])],
      {},
    )
    const field: ExportedField | undefined = result.model.fieldsByName.get('campo')
    if (!field) throw new Error('falta el campo')

    return field
  }

  it('número: afijos recortados, placeholder, tooltip y dígitos', () => {
    const field: ExportedField = exportedAs('number')

    expect([field.prefix, field.suffix, field.placeholder]).toEqual(['$', 'kW', 'Escriba'])
    expect(field.tooltip?.position).toBe('top')
    expect(field.maxLength).toBe(8)
    expect([field.suggestions, field.inlineOptions, field.dateFormat]).toEqual([
      undefined,
      undefined,
      undefined,
    ])
  })

  it('texto con sugerencias: las sugerencias sin vacías ni repetidas, sin afijos', () => {
    const field: ExportedField = exportedAs('datalist')

    expect(field.suggestions).toEqual(['Bogotá', 'Cali'])
    expect([field.prefix, field.suffix]).toEqual([undefined, undefined])
  })

  it('fecha: formato, rango y hora; sin placeholder ni largo', () => {
    const field: ExportedField = exportedAs('date')

    expect([field.dateFormat, field.dateRange, field.includesTime]).toEqual([
      'DD/MM/YYYY',
      true,
      true,
    ])
    expect([field.placeholder, field.maxLength]).toEqual([undefined, undefined])
  })

  it('opción única y grupo de casillas en línea; la lista no', () => {
    expect(exportedAs('radio_group').inlineOptions).toBe(true)
    expect(exportedAs('checkbox_group').inlineOptions).toBe(true)
    expect(exportedAs('select').inlineOptions).toBeUndefined()
  })

  it('el tooltip no viaja en los tipos que no lo admiten ni vacío', () => {
    expect(exportedAs('textarea').tooltip).toBeUndefined()
    expect(exportedAs('label').tooltip).toBeUndefined()

    const empty: PipelineResult = runPipeline(
      [
        makeStep('Paso', [
          makeField('text', 'campo', {
            tooltip: {
              content: [{ type: 'paragraph', children: [{ text: '' }] }],
              position: 'top',
            },
          }),
        ]),
      ],
      {},
    )
    expect(empty.model.fieldsByName.get('campo')?.tooltip).toBeUndefined()
  })
})

describe('fechas de punta a punta', () => {
  it('con formato valida en AAAA-MM-DD y viaja en el formato del campo', () => {
    const steps: FormStep[] = [
      makeStep('Paso', [
        makeField('date', 'cierre', {
          dateFormat: 'DD/MM/YYYY',
          apiBinding: { kind: 'mapped', path: 'cierre' },
        }),
      ]),
    ]
    const result: PipelineResult = runPipeline(steps, { cierre: '2026-03-31' })

    expect(result.validation.errors).toEqual({})
    expect(result.payload).toEqual({ cierre: '31/03/2026' })
  })

  it('un rango con hora valida las dos puntas y viaja como objeto', () => {
    const steps: FormStep[] = [
      makeStep('Paso', [
        makeField('date', 'vigencia', {
          dateRange: true,
          includesTime: true,
          validations: { required: true },
          apiBinding: { kind: 'mapped', path: 'vigencia' },
        }),
      ]),
    ]
    const ok: PipelineResult = runPipeline(steps, {
      vigencia: { desde: '2026-01-01T08:00', hasta: '2026-01-31T18:00' },
    })
    const half: PipelineResult = runPipeline(steps, {
      vigencia: { desde: '2026-01-01T08:00', hasta: '' },
    })

    expect(ok.validation.errors).toEqual({})
    expect(ok.payload).toEqual({
      vigencia: { desde: '2026-01-01T08:00', hasta: '2026-01-31T18:00' },
    })
    expect(half.validation.errors.vigencia).toBe('Falta la fecha final')
  })
})

describe('grupo repetible de punta a punta', () => {
  const steps: FormStep[] = [
    makeStep(
      'Actividades',
      [
        makeRow(
          [
            makeField('search_select', 'actividad', {
              validations: { required: true },
              apiBinding: { kind: 'mapped', path: 'actividades[].idActividad' },
            }),
            makeField('number', 'ingresos', {
              validations: { required: true, min: 0 },
              apiBinding: { kind: 'mapped', path: 'actividades[].ingresoGravado' },
            }),
            makeField('calculated', 'impuesto', {
              rounding: true,
              apiBinding: { kind: 'mapped', path: 'actividades[].valorImpuesto' },
              logic: { script: 'return {{ingresos}} * 4 / 1000;' },
            }),
          ],
          'grupo-actividades',
        ),
        makeField('calculated', 'total', {
          apiBinding: { kind: 'mapped', path: 'totalImpuesto' },
          logic: { script: 'return sum({{impuesto}});' },
        }),
      ],
      [makeGroup('actividades', { min: 1, max: 3, arrayPath: 'actividades' })],
    ),
  ]

  it('cada fila valida y calcula aparte, y el total suma la columna', () => {
    const result: PipelineResult = runPipeline(
      steps,
      {},
      {
        groups: {
          'grupo-actividades': [
            { actividad: '4711', ingresos: 1_000_000 },
            { actividad: '5611', ingresos: 2_000_000 },
          ],
        },
      },
    )

    expect(result.validation.errors).toEqual({})
    expect(result.payload).toEqual({
      actividades: [
        { idActividad: '4711', ingresoGravado: 1_000_000, valorImpuesto: 4000 },
        { idActividad: '5611', ingresoGravado: 2_000_000, valorImpuesto: 8000 },
      ],
      totalImpuesto: 12000,
    })
  })

  it('el error de una fila dice cuál es', () => {
    const result: PipelineResult = runPipeline(
      steps,
      {},
      {
        groups: { 'grupo-actividades': [{ actividad: '4711', ingresos: 1 }, { ingresos: -5 }] },
      },
    )

    expect(Object.keys(result.validation.errors).sort()).toEqual([
      'grupo-actividades:1:actividad',
      'grupo-actividades:1:ingresos',
    ])
  })

  it('el grupo declara su tope de filas en el schema', () => {
    const result: PipelineResult = runPipeline(steps, {})

    expect(result.exported.formSchema.steps[0].groups?.[0].zodSchema).toContain('.min(1).max(3)')
    expect(result.exported.projectMeta.requires).toContain('step.groups')
  })
})

describe.each<[FormType, string]>([
  ['industria_comercio', 'ica'],
  ['retencion_industria_comercio', 'reteica'],
  ['autorretencion', 'autoretencionIca'],
])('declaración %s', (formType, declaracion) => {
  // El mismo formulario chico en las tres: cambia la lista de vencimientos que le toca, nada mas.
  const steps: FormStep[] = [
    makeStep('Paso', [
      makeField('text', 'documento', {
        validations: { required: true },
        apiBinding: { kind: 'mapped', path: 'documento' },
      }),
      // text y no calculated: un calculado siempre valida como numero.
      makeField('text', 'limite', {
        apiBinding: { kind: 'mapped', path: 'limite' },
        logic: { script: 'return fechaLimite(2025, 1, {{documento}}) ?? "sin tabla";' },
      }),
      makeField('number', 'minima', {
        apiBinding: { kind: 'mapped', path: 'minima' },
        logic: { script: 'return uvt() * 10;' },
      }),
    ]),
  ]
  const result: PipelineResult = runPipeline(steps, { documento: '900123456' }, { formType })

  it('el export lleva su tipo y el runtime elige su lista de vencimientos', () => {
    expect(result.exported.projectMeta.formType).toBe(formType)
    expect(result.model.declaracion).toBe(declaracion)
  })

  it('solo ICA trae vencimientos de fábrica; retención y autorretención no se inventan', () => {
    expect(result.payload.limite).toBe(
      formType === 'industria_comercio' ? '2026/03/31' : 'sin tabla',
    )
  })

  it('valida, calcula con la UVT y arma el payload igual en las tres', () => {
    expect(result.validation.errors).toEqual({})
    expect(result.payload.documento).toBe('900123456')
    expect(result.payload.minima).toBe(523_740)
    expect(runPipeline(steps, {}, { formType }).validation.errors.documento).toBeDefined()
  })
})
