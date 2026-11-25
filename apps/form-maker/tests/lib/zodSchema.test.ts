import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { makeField, makeGroup } from '../helpers/canvasFixtures'
import type { CanvasField } from '../../src/types'
import { hydrateZodSchema } from '../../src/lib/zodHydrate/zodHydrate'
import {
  buildGroupZodSchema,
  buildOverrideZodSchema,
  buildZodSchema,
} from '../../src/lib/zodSchema/zodSchema'
import {
  RANGE_ORDER_MESSAGE,
  RANGE_START_MISSING,
} from '../../src/lib/zodSchema/zodSchema.constants'

// El schema viaja como texto: cada prueba lo hidrata como el consumidor y lo corre contra valores.

function schemaOf(source: string): z.ZodType {
  const { schema, error } = hydrateZodSchema(source)
  if (!schema) throw new Error(`El schema no hidrata: ${error ?? source}`)

  return schema
}

function accepts(field: CanvasField, value: unknown): boolean {
  return schemaOf(buildZodSchema(field)).safeParse(value).success
}

function messageOf(field: CanvasField, value: unknown): string | undefined {
  const result = schemaOf(buildZodSchema(field)).safeParse(value)

  return result.success ? undefined : result.error.issues[0]?.message
}

describe('obligatorio u opcional', () => {
  it('sin required lleva .optional() y acepta vacío', () => {
    const field: CanvasField = makeField('text', 'nombre')

    expect(buildZodSchema(field)).toBe('z.string().optional()')
    expect(accepts(field, undefined)).toBe(true)
  })

  it('con required no acepta vacío', () => {
    const field: CanvasField = makeField('text', 'nombre', { validations: { required: true } })

    expect(accepts(field, undefined)).toBe(false)
    expect(accepts(field, 'Ana')).toBe(true)
  })

  it('el checkbox nunca es opcional: es un booleano', () => {
    expect(buildZodSchema(makeField('checkbox', 'acepta'))).toBe('z.boolean()')
  })
})

describe('texto', () => {
  it('largo mínimo y máximo', () => {
    const field: CanvasField = makeField('text', 'codigo', {
      validations: { minLength: 2, maxLength: 4 },
    })

    expect(accepts(field, 'a')).toBe(false)
    expect(accepts(field, 'abcd')).toBe(true)
    expect(accepts(field, 'abcde')).toBe(false)
  })

  it('patrón con su mensaje', () => {
    const field: CanvasField = makeField('text', 'nit', {
      validations: { pattern: '^\\d{9}$', message: 'Nueve dígitos' },
    })

    expect(accepts(field, '900123456')).toBe(true)
    expect(messageOf(field, '9001')).toBe('Nueve dígitos')
  })

  it('teléfono y correo validan con su formato de fábrica', () => {
    const tel: CanvasField = makeField('tel', 'celular')
    const fijo: CanvasField = makeField('tel', 'fijo', { phoneKind: 'fijo' })
    const email: CanvasField = makeField('email', 'correo')

    expect(accepts(tel, '3001234567')).toBe(true)
    expect(accepts(tel, '6011234567')).toBe(false)
    expect(accepts(fijo, '6011234567')).toBe(true)
    expect(accepts(email, 'ana@empresa.co')).toBe(true)
    expect(messageOf(email, 'ana@')).toBe('Ingrese un correo válido')
  })

  it('el patrón del autor reemplaza al de fábrica', () => {
    const tel: CanvasField = makeField('tel', 'ext', { validations: { pattern: '^\\d{3}$' } })

    expect(accepts(tel, '123')).toBe(true)
    // Sin mensaje propio toma el del tipo.
    expect(messageOf(tel, '3001234567')).toContain('celular')
  })
})

describe('números', () => {
  it('mínimo, máximo y dígitos de la parte entera', () => {
    const field: CanvasField = makeField('number', 'monto', {
      validations: { min: 0, max: 99999, maxLength: 4 },
    })

    expect(accepts(field, -1)).toBe(false)
    expect(accepts(field, 9999.99)).toBe(true)
    expect(messageOf(field, 12345)).toBe('Máximo 4 dígitos')
    expect(accepts(field, '10')).toBe(false)
  })
})

describe('opciones', () => {
  it('opciones a mano enumeran sus ids; un campo mapeado recibe el catálogo y es texto', () => {
    const manual: CanvasField = makeField('select', 'tipo', {
      apiBinding: { kind: 'excluded' },
      options: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    })
    const mapped: CanvasField = makeField('select', 'municipio', {
      apiBinding: { kind: 'mapped', path: 'municipio' },
      options: [{ id: 'a', label: 'A' }],
    })

    expect(buildZodSchema(manual)).toBe('z.enum(["a", "b"]).optional()')
    expect(accepts(manual, 'c')).toBe(false)
    expect(buildZodSchema(mapped)).toBe('z.string().optional()')
  })

  it('el checkbox_group es una lista; obligatorio pide al menos una', () => {
    const field: CanvasField = makeField('checkbox_group', 'servicios', {
      validations: { required: true },
    })

    expect(accepts(field, [])).toBe(false)
    expect(accepts(field, ['x'])).toBe(true)
    expect(accepts(field, 'x')).toBe(false)
  })
})

describe('fechas', () => {
  it('AAAA-MM-DD sin hora, y con hora si includesTime', () => {
    const date: CanvasField = makeField('date', 'fecha')
    const withTime: CanvasField = makeField('date', 'cita', { includesTime: true })

    expect(accepts(date, '2026-03-31')).toBe(true)
    expect(messageOf(date, '31/03/2026')).toBe('Fecha inválida')
    expect(accepts(withTime, '2026-03-31T08:30')).toBe(true)
    expect(accepts(withTime, '2026-03-31')).toBe(false)
  })

  it('un límite fijo se compara por día y avisa la regla', () => {
    const field: CanvasField = makeField('date', 'cierre', {
      validations: {
        minDate: { kind: 'fixed', date: '2026-01-01' },
        maxDate: { kind: 'fixed', date: '2026-12-31' },
      },
    })

    expect(accepts(field, '2026-06-10')).toBe(true)
    expect(messageOf(field, '2025-12-31')).toBe('La fecha no puede ser anterior al 01/01/2026')
    expect(messageOf(field, '2027-01-01')).toBe('La fecha no puede ser posterior al 31/12/2026')
  })

  it('un límite a medio escribir no viaja', () => {
    const field: CanvasField = makeField('date', 'cierre', {
      validations: { minDate: { kind: 'fixed', date: '2026-01' } },
    })

    expect(buildZodSchema(field)).not.toContain('refine')
  })

  it('el límite "hoy" compara con el reloj de quien llena', () => {
    const field: CanvasField = makeField('date', 'nacimiento', {
      validations: { maxDate: { kind: 'today' } },
    })

    expect(accepts(field, '2000-01-01')).toBe(true)
    expect(accepts(field, '9999-12-31')).toBe(false)
  })

  it('un rango pide las dos puntas y en orden', () => {
    const field: CanvasField = makeField('date', 'periodo', { dateRange: true })

    expect(accepts(field, { desde: '2026-01-01', hasta: '2026-12-31' })).toBe(true)
    expect(messageOf(field, { desde: '', hasta: '2026-12-31' })).toBe(RANGE_START_MISSING)
    expect(messageOf(field, { desde: '2026-12-31', hasta: '2026-01-01' })).toBe(RANGE_ORDER_MESSAGE)
    expect(accepts(field, undefined)).toBe(true)
  })
})

describe('archivos', () => {
  it('tamaño máximo y formatos aceptados', () => {
    const field: CanvasField = makeField('file', 'rut', {
      fileConfig: { acceptedFormats: ['.pdf', 'image/*'], maxSizeMB: 1 },
    })

    expect(accepts(field, new File(['x'], 'rut.PDF', { type: 'application/pdf' }))).toBe(true)
    expect(accepts(field, new File(['x'], 'foto.png', { type: 'image/png' }))).toBe(true)
    expect(
      messageOf(field, new File(['x'], 'datos.xlsx', { type: 'application/vnd.ms-excel' })),
    ).toBe('Formato no permitido')
    expect(messageOf(field, new File([new Uint8Array(2 * 1024 * 1024)], 'rut.pdf'))).toBe(
      'Máximo 1MB',
    )
  })
})

describe('overrides y grupos', () => {
  it('el override se fusiona sobre la base', () => {
    const field: CanvasField = makeField('text', 'documento', {
      validations: { required: true, pattern: '^\\d{6,10}$', message: 'Documento' },
    })
    const source: string = buildOverrideZodSchema(field, {
      id: 'o1',
      when: { fieldId: 'id-tipo', operator: 'equals', value: '2' },
      validations: { pattern: '^\\d{6,9}$' },
    })

    expect(schemaOf(source).safeParse('1234567890').success).toBe(false)
    expect(schemaOf(source).safeParse('123456789').success).toBe(true)
    // required y el mensaje vienen de la base.
    expect(schemaOf(source).safeParse(undefined).success).toBe(false)
  })

  it('el grupo es un array de objetos con su mínimo y máximo, sin los presentacionales', () => {
    const source: string = buildGroupZodSchema(makeGroup('actividades', { min: 1, max: 2 }), [
      makeField('number', 'ingresos', { validations: { required: true } }),
      makeField('label', 'rotulo'),
    ])

    expect(source).not.toContain('rotulo')
    expect(schemaOf(source).safeParse([]).success).toBe(false)
    expect(schemaOf(source).safeParse([{ ingresos: 1 }]).success).toBe(true)
    expect(
      schemaOf(source).safeParse([{ ingresos: 1 }, { ingresos: 2 }, { ingresos: 3 }]).success,
    ).toBe(false)
  })
})

describe('hydrateZodSchema', () => {
  it('vacío no es error; roto o sin validador sí', () => {
    expect(hydrateZodSchema(undefined)).toEqual({ schema: null, error: null })
    expect(hydrateZodSchema('  ')).toEqual({ schema: null, error: null })
    expect(hydrateZodSchema('z.string(').error).not.toBeNull()
    expect(hydrateZodSchema('42').error).toBe('El schema no produjo un validador de Zod.')
  })
})
