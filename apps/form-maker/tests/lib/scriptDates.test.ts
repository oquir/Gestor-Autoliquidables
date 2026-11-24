import { describe, expect, it } from 'vitest'
import { DATE_HELPER_NAMES } from '../../src/constants'
import type { ReglaAnio, RuntimeContext, ScriptFunction } from '../../src/types'
import { buildDateHelpers } from '../../src/lib/scriptDates/scriptDates'

const REGLAS: ReglaAnio[] = [
  {
    anio: 2025,
    periodicidad: 'anual',
    tipoDigito: 'ninguno',
    fechas: [{ periodo: 1, fecha: '2026/03/31' }],
  },
  {
    anio: 2026,
    periodicidad: 'bimestral',
    tipoDigito: 'ultimo_digito',
    fechas: [{ periodo: 2, digito: 6, fecha: '2026/05/18' }],
  },
]

// Los helpers se llaman por posicion (compiled los recibe en el orden de DATE_HELPER_NAMES).
function helpers(hoy: string, reglas: ReglaAnio[] = REGLAS): Record<string, ScriptFunction> {
  const context: RuntimeContext = { reglas, hoy, valores: [] }
  const list: ScriptFunction[] = buildDateHelpers(context)

  return Object.fromEntries(DATE_HELPER_NAMES.map((name, index) => [name, list[index]]))
}

describe('buildDateHelpers', () => {
  it('devuelve un helper por nombre, en el orden del contrato', () => {
    const context: RuntimeContext = { reglas: REGLAS, hoy: '2026/01/01', valores: [] }

    expect(buildDateHelpers(context)).toHaveLength(DATE_HELPER_NAMES.length)
    expect(DATE_HELPER_NAMES).toEqual(['fechaLimite', 'diasDeMora', 'mesesDeMora'])
  })

  it('fechaLimite busca por año, periodo y documento', () => {
    const { fechaLimite } = helpers('2026/01/01')

    expect(fechaLimite(2025, 1, '900123456')).toBe('2026/03/31')
    expect(fechaLimite('2026', '2', '900123456')).toBe('2026/05/18')
  })

  it('fechaLimite cae al periodo 1 si no lo pasan o llega vacío', () => {
    const { fechaLimite } = helpers('2026/01/01')

    expect(fechaLimite(2025)).toBe('2026/03/31')
    expect(fechaLimite(2025, '', '')).toBe('2026/03/31')
  })

  it('fechaLimite da null sin tabla para el año o sin año', () => {
    const { fechaLimite } = helpers('2026/01/01')

    expect(fechaLimite(2024, 1, '900123456')).toBeNull()
    expect(fechaLimite(undefined, 1, '900123456')).toBeNull()
    expect(fechaLimite('', 1, '900123456')).toBeNull()
    expect(fechaLimite(2026, 2, '')).toBeNull()
  })

  it('a tiempo no hay mora', () => {
    const { diasDeMora, mesesDeMora } = helpers('2026/03/31')

    expect(diasDeMora(2025, 1, '900123456')).toBe(0)
    expect(mesesDeMora(2025, 1, '900123456')).toBe(0)
  })

  it('tarde, cuenta días y meses o fracción contra hoy', () => {
    const { diasDeMora, mesesDeMora } = helpers('2026/06/10')

    expect(diasDeMora(2025, 1, '900123456')).toBe(71)
    expect(mesesDeMora(2025, 1, '900123456')).toBe(3)
  })

  it('un día tarde es un día y un mes', () => {
    const { diasDeMora, mesesDeMora } = helpers('2026/04/01')

    expect(diasDeMora(2025, 1, '900123456')).toBe(1)
    expect(mesesDeMora(2025, 1, '900123456')).toBe(1)
  })

  it('sin tabla la mora es 0, no NaN: una sanción no nace de un dato que falta', () => {
    const { diasDeMora, mesesDeMora } = helpers('2027/01/01', [])

    expect(diasDeMora(2025, 1, '900123456')).toBe(0)
    expect(mesesDeMora(2025, 1, '900123456')).toBe(0)
  })
})
