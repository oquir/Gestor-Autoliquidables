import { describe, expect, it } from 'vitest'
import {
  fieldId,
  makeField,
  makeGroup,
  makeRow,
  makeStep,
  modelOf,
} from '../helpers/canvasFixtures'
import type {
  ExportedField,
  FormStep,
  PreviewState,
  RuntimeModel,
  RuntimeSnapshot,
  ValidationResult,
} from '../../src/types'
import { createInitialState, resolveRuntime } from '../../src/lib/formRuntime/formRuntime'
import { stepErrorKeys } from '../../src/lib/formRuntime/formRuntime.utils'
import { validateRuntime } from '../../src/lib/runtimeValidation/runtimeValidation'
import {
  checkKey,
  coerceValue,
  fieldKey,
  isRequiredBySchema,
} from '../../src/lib/runtimeValidation/runtimeValidation.utils'

function validate(
  steps: FormStep[],
  values: Record<string, unknown>,
  groups?: Record<string, Record<string, unknown>[]>,
): ValidationResult {
  const model: RuntimeModel = modelOf(steps)
  const initial: PreviewState = createInitialState(model)
  const state: PreviewState = { values, groups: { ...initial.groups, ...groups } }
  const snapshot: RuntimeSnapshot = resolveRuntime(model, state)

  return validateRuntime(model, snapshot)
}

describe('errores de los campos', () => {
  const steps: FormStep[] = [
    makeStep('Datos', [
      makeField('text', 'nombre', { validations: { required: true } }),
      makeField('number', 'monto', { validations: { min: 0 } }),
      makeField('text', 'opcional'),
    ]),
  ]

  it('un obligatorio vacío y un número fuera de rango dan error por nombre', () => {
    const result: ValidationResult = validate(steps, { nombre: '', monto: -5 })

    expect(Object.keys(result.errors).sort()).toEqual(['monto', 'nombre'])
  })

  it('lleno bien, sin errores; el opcional vacío pasa', () => {
    expect(validate(steps, { nombre: 'Ana', monto: '10', opcional: '' }).errors).toEqual({})
  })

  it('un campo oculto no se valida', () => {
    const hidden: FormStep[] = [
      makeStep('Datos', [
        makeField('text', 'tipo'),
        makeField('text', 'descripcion', {
          validations: { required: true },
          visibleWhen: { fieldId: fieldId('tipo'), operator: 'equals', value: 'otra' },
        }),
      ]),
    ]

    expect(validate(hidden, { tipo: 'normal' }).errors).toEqual({})
    expect(Object.keys(validate(hidden, { tipo: 'otra' }).errors)).toEqual(['descripcion'])
  })

  it('un rótulo no se valida', () => {
    expect(validate([makeStep('Datos', [makeField('label', 'titulo')])], {}).errors).toEqual({})
  })
})

describe('validaciones condicionales', () => {
  // El caso que las motivo: el documento pide 6-10 digitos y 6-9 si es NIT.
  const steps: FormStep[] = [
    makeStep('Datos', [
      makeField('select', 'tipo_documento'),
      makeField('text', 'numero_documento', {
        validations: {
          required: true,
          pattern: '^\\d{6,10}$',
          overrides: [
            {
              id: 'nit',
              when: { fieldId: fieldId('tipo_documento'), operator: 'equals', value: '2' },
              validations: { pattern: '^\\d{6,9}$' },
            },
          ],
        },
      }),
    ]),
  ]

  it('sin la condición rige la base', () => {
    expect(validate(steps, { tipo_documento: '1', numero_documento: '1234567890' }).errors).toEqual(
      {},
    )
  })

  it('con la condición rige el override', () => {
    expect(
      Object.keys(validate(steps, { tipo_documento: '2', numero_documento: '1234567890' }).errors),
    ).toEqual(['numero_documento'])
  })

  it('isRequiredBySchema mira la variante que aplica', () => {
    const model: RuntimeModel = modelOf(steps)
    const field: ExportedField | undefined = model.fieldsByName.get('numero_documento')
    if (!field) throw new Error('falta el campo')

    expect(isRequiredBySchema(field, { tipo_documento: '2' })).toBe(true)
    expect(isRequiredBySchema(model.fieldsByName.get('tipo_documento') as ExportedField)).toBe(
      false,
    )
  })
})

describe('grupos repetibles', () => {
  const steps: FormStep[] = [
    makeStep(
      'Actividades',
      [
        makeRow([makeField('number', 'ingresos', { validations: { required: true } })], 'grupo-a'),
        makeField('number', 'total_declarado'),
      ],
      [
        makeGroup('a', {
          checks: [
            {
              id: 'suma',
              label: 'Suma',
              enabled: true,
              script: 'return sum({{ingresos}}) === {{total_declarado}};',
              message: 'No cuadra',
            },
            {
              id: 'apagada',
              label: 'Apagada',
              enabled: false,
              script: 'return false;',
              message: 'Nunca',
            },
          ],
        }),
      ],
    ),
  ]

  it('el error de una fila lleva grupo y repetición', () => {
    const result: ValidationResult = validate(
      steps,
      { total_declarado: 5 },
      {
        'grupo-a': [{ ingresos: 5 }, { ingresos: undefined }],
      },
    )

    expect(result.errors[fieldKey('ingresos', 'grupo-a', 1)]).toBeDefined()
    expect(result.errors[fieldKey('ingresos', 'grupo-a', 0)]).toBeUndefined()
  })

  it('una comprobación que no se cumple da su mensaje; la apagada no corre', () => {
    const result: ValidationResult = validate(
      steps,
      { total_declarado: 99 },
      {
        'grupo-a': [{ ingresos: 5 }],
      },
    )

    expect(result.errors[checkKey('grupo-a', 'suma')]).toBe('No cuadra')
    expect(result.errors[checkKey('grupo-a', 'apagada')]).toBeUndefined()
  })

  it('si cuadra, sin error', () => {
    const result: ValidationResult = validate(
      steps,
      { total_declarado: 8 },
      {
        'grupo-a': [{ ingresos: 5 }, { ingresos: 3 }],
      },
    )

    expect(result.errors).toEqual({})
  })

  it('una comprobación que revienta es un problema del formulario y deja pasar', () => {
    const broken: FormStep[] = [
      makeStep(
        'Actividades',
        [makeRow([makeField('number', 'ingresos')], 'grupo-a')],
        [
          makeGroup('a', {
            checks: [
              { id: 'rota', label: 'Rota', enabled: true, script: 'return x.y;', message: 'x' },
            ],
          }),
        ],
      ),
    ]
    const result: ValidationResult = validate(broken, {}, { 'grupo-a': [{ ingresos: 1 }] })

    expect(result.errors).toEqual({})
    expect(result.issues).toEqual([expect.objectContaining({ kind: 'script', field: 'Rota' })])
  })

  it('las claves de un paso incluyen cada fila y cada comprobación', () => {
    const model: RuntimeModel = modelOf(steps)
    const snapshot: RuntimeSnapshot = resolveRuntime(model, {
      values: {},
      groups: { 'grupo-a': [{}, {}] },
    })

    expect(stepErrorKeys(model.steps[0], snapshot)).toEqual([
      'grupo-a:0:ingresos',
      'grupo-a:1:ingresos',
      'total_declarado',
      'check:grupo-a:suma',
    ])
  })
})

describe('problemas del formulario', () => {
  it('un ciclo aparece en issues', () => {
    const result: ValidationResult = validate(
      [
        makeStep('Paso', [
          makeField('calculated', 'a', { logic: { script: 'return {{b}};' } }),
          makeField('calculated', 'b', { logic: { script: 'return {{a}};' } }),
        ]),
      ],
      {},
    )

    expect(result.issues).toEqual([expect.objectContaining({ kind: 'cycle' })])
  })
})

// Hallazgo 4.1 de docs/Hallazgos-Pruebas.md: el obligatorio solo mira la ausencia de .optional().
// El numero con espacios no va: el input numerico solo deja digitos, separadores y signo.
describe('obligatorios con valores que parecen vacíos', () => {
  const steps: FormStep[] = [
    makeStep('Datos', [
      makeField('text', 'nombre', { validations: { required: true } }),
      makeField('number', 'monto', { validations: { required: true } }),
      makeField('checkbox', 'acepto', { validations: { required: true } }),
    ]),
  ]

  // BUG: un texto obligatorio con solo espacios pasa: coerceValue solo convierte '' en undefined.
  // Pendiente de confirmar con el usuario; it.fails avisa cuando se corrija.
  it.fails('un texto obligatorio con solo espacios da error', () => {
    expect(validate(steps, { nombre: '   ', monto: 1, acepto: true }).errors.nombre).toBeDefined()
  })

  // RIESGO: el checkbox nunca exige marcarse (z.boolean() sin .optional() acepta false). Fija lo
  // que pasa hoy; si se decide que required obliga a marcarlo, esta prueba cambia a proposito.
  it('un checkbox obligatorio sin marcar no da error', () => {
    expect(validate(steps, { nombre: 'Ana', monto: 1, acepto: false }).errors).toEqual({})
  })
})

describe('coerceValue', () => {
  const field = (type: string): ExportedField => ({ type }) as ExportedField

  it('un number llega como texto del input y se convierte', () => {
    expect(coerceValue(field('number'), '12')).toBe(12)
    expect(coerceValue(field('number'), '')).toBeUndefined()
    expect(coerceValue(field('calculated'), 'abc')).toBe('abc')
  })

  it('vacío a undefined para que .optional() lo acepte', () => {
    expect(coerceValue(field('text'), '')).toBeUndefined()
    expect(coerceValue(field('text'), null)).toBeUndefined()
    expect(coerceValue(field('text'), 'x')).toBe('x')
  })

  it('checkbox a booleano y multiselección a lista', () => {
    expect(coerceValue(field('checkbox'), undefined)).toBe(false)
    expect(coerceValue(field('checkbox_group'), 'a')).toEqual(['a'])
    expect(coerceValue(field('checkbox_group'), undefined)).toBeUndefined()
  })
})
