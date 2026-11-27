import { describe, expect, it } from 'vitest'
import {
  applyDecimals,
  applyRounding,
  exportableDecimals,
  exportableRounding,
  roundToDecimals,
  roundToMultiple,
  supportsRounding,
} from '../../src/lib/fieldRounding/fieldRounding'

describe('roundToMultiple', () => {
  it('aproxima al múltiplo de mil más cercano', () => {
    expect(roundToMultiple(1499, 1000)).toBe(1000)
    expect(roundToMultiple(1501, 1000)).toBe(2000)
    expect(roundToMultiple(523740, 1000)).toBe(524000)
  })

  it('rompe el empate de .5 hacia afuera, con negativos simétricos', () => {
    expect(roundToMultiple(1500, 1000)).toBe(2000)
    // Math.round a secas daria -1000.
    expect(roundToMultiple(-1500, 1000)).toBe(-2000)
    expect(roundToMultiple(-1499, 1000)).toBe(-1000)
  })

  it('no devuelve -0', () => {
    expect(Object.is(roundToMultiple(-400, 1000), 0)).toBe(true)
  })

  it('deja intacto lo que no es finito o un múltiplo inválido', () => {
    expect(roundToMultiple(Number.NaN, 1000)).toBeNaN()
    expect(roundToMultiple(Number.POSITIVE_INFINITY, 1000)).toBe(Number.POSITIVE_INFINITY)
    expect(roundToMultiple(1234, 0)).toBe(1234)
    expect(roundToMultiple(1234, -1000)).toBe(1234)
  })
})

describe('roundToDecimals', () => {
  it('sigue lo que se imprime y no la cola binaria', () => {
    // toFixed(1) daria 0,3: 0.35 se guarda como 0.34999...
    expect(roundToDecimals(0.35, 1)).toBe(0.4)
    expect(roundToDecimals(0.1 + 0.2, 2)).toBe(0.3)
  })

  // RIESGO (hallazgo 4.7 de docs/Hallazgos-Pruebas.md): el comentario de roundToDecimals ya lo
  // admite; aca queda fijado. 1.005 se guarda como 1.00499...
  it('1.005 a dos decimales da 1', () => {
    expect(roundToDecimals(1.005, 2)).toBe(1)
  })

  it('es simétrico con negativos y no devuelve -0', () => {
    expect(roundToDecimals(-0.35, 1)).toBe(-0.4)
    expect(Object.is(roundToDecimals(-0.04, 1), 0)).toBe(true)
  })

  it('con 0 decimales redondea al entero', () => {
    expect(roundToDecimals(7.5, 0)).toBe(8)
    expect(roundToDecimals(-7.5, 0)).toBe(-8)
  })

  it('deja intacto un valor sin dígitos exactos o con decimales negativos', () => {
    expect(roundToDecimals(Number.MAX_SAFE_INTEGER * 10, 2)).toBe(Number.MAX_SAFE_INTEGER * 10)
    expect(roundToDecimals(1.234, -1)).toBe(1.234)
  })
})

describe('applyRounding', () => {
  it('redondea al millar solo los numéricos con rounding encendido', () => {
    expect(applyRounding({ type: 'number', rounding: true }, 1499)).toBe(1000)
    expect(applyRounding({ type: 'calculated', rounding: true }, '2600')).toBe(3000)
    expect(applyRounding({ type: 'number' }, 1499)).toBe(1499)
    expect(applyRounding({ type: 'text', rounding: true }, 1499)).toBe(1499)
  })

  it('un campo vacío sigue vacío: un 0 pasaría el required', () => {
    const field = { type: 'number', rounding: true }

    expect(applyRounding(field, undefined)).toBeUndefined()
    expect(applyRounding(field, null)).toBeNull()
    expect(applyRounding(field, '  ')).toBe('  ')
    expect(applyRounding(field, 'abc')).toBe('abc')
  })
})

describe('applyDecimals', () => {
  it('recorta a los decimales del campo', () => {
    expect(applyDecimals({ type: 'number', decimals: 1 }, 4.25)).toBe(4.3)
    expect(applyDecimals({ type: 'number', decimals: 0 }, '7.5')).toBe(8)
  })

  it('sin decimals o en un tipo que no los admite, no toca el valor', () => {
    expect(applyDecimals({ type: 'number' }, 4.25)).toBe(4.25)
    expect(applyDecimals({ type: 'text', decimals: 1 }, 4.25)).toBe(4.25)
    expect(applyDecimals({ type: 'number', decimals: 1 }, '')).toBe('')
  })
})

describe('lo que viaja en el export', () => {
  it('rounding y decimals solo en los tipos numéricos', () => {
    expect(supportsRounding('number')).toBe(true)
    expect(supportsRounding('calculated')).toBe(true)
    expect(supportsRounding('text')).toBe(false)

    expect(exportableRounding({ type: 'number', rounding: true })).toBe(true)
    expect(exportableRounding({ type: 'number', rounding: false })).toBeUndefined()
    expect(exportableRounding({ type: 'select', rounding: true })).toBeUndefined()

    expect(exportableDecimals({ type: 'number', decimals: 0 })).toBe(0)
    expect(exportableDecimals({ type: 'text', decimals: 2 })).toBeUndefined()
  })
})
