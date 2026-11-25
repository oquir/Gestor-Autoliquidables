import { describe, expect, it } from 'vitest'
import {
  capIntegerDigits,
  formatForDisplay,
  formatNumber,
  parseFormattedNumber,
  sanitizeNumericInput,
  toEditableText,
} from '../../src/lib/numberFormat/numberFormat'

describe('parseFormattedNumber', () => {
  it('lee punto de miles y coma decimal', () => {
    expect(parseFormattedNumber('1.234.567')).toBe(1234567)
    expect(parseFormattedNumber('1.234,56')).toBe(1234.56)
    expect(parseFormattedNumber('0,5')).toBe(0.5)
    expect(parseFormattedNumber('  42  ')).toBe(42)
  })

  it('el punto siempre es de miles: "1.5" es 15', () => {
    expect(parseFormattedNumber('1.5')).toBe(15)
  })

  it('lee negativos', () => {
    expect(parseFormattedNumber('-1.000')).toBe(-1000)
    expect(parseFormattedNumber('-0,25')).toBe(-0.25)
  })

  it('vacío o inválido da null', () => {
    expect(parseFormattedNumber('')).toBeNull()
    expect(parseFormattedNumber('   ')).toBeNull()
    expect(parseFormattedNumber('-')).toBeNull()
    expect(parseFormattedNumber(',')).toBeNull()
    expect(parseFormattedNumber('abc')).toBeNull()
    expect(parseFormattedNumber('1,2,3')).toBeNull()
    expect(parseFormattedNumber('12-3')).toBeNull()
  })

  it('no acepta notación que Number() sí leería', () => {
    expect(parseFormattedNumber('1e5')).toBeNull()
    expect(parseFormattedNumber('0x10')).toBeNull()
    expect(parseFormattedNumber('Infinity')).toBeNull()
  })
})

describe('formatNumber', () => {
  it('agrupa de a tres con punto y usa coma decimal', () => {
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber(1234.5)).toBe('1.234,5')
    expect(formatNumber(-1000)).toBe('-1.000')
  })

  it('corta la cola de la coma flotante', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0,3')
  })

  it('con decimals rellena con ceros', () => {
    expect(formatNumber(4, 1)).toBe('4,0')
    expect(formatNumber(1000, 2)).toBe('1.000,00')
  })

  it('el cero negativo sale "0"', () => {
    expect(formatNumber(-0)).toBe('0')
  })

  it('lo que no es finito sale vacío', () => {
    expect(formatNumber(Number.NaN)).toBe('')
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('')
  })

  it('hace ida y vuelta exacta con el parser', () => {
    const samples: number[] = [0, 7, 1000, 1234567.891, -98765.4321, 0.0001]

    for (const value of samples) {
      expect(parseFormattedNumber(formatNumber(value))).toBe(value)
    }
  })
})

describe('sanitizeNumericInput', () => {
  it('deja solo dígitos, separadores y el signo', () => {
    expect(sanitizeNumericInput('$ 1.234,5 COP')).toBe('1.234,5')
    expect(sanitizeNumericInput('-12a3')).toBe('-123')
  })

  it('sin negativos permitidos se cae el signo', () => {
    expect(sanitizeNumericInput('-123', false)).toBe('123')
  })

  it('deja una sola coma', () => {
    expect(sanitizeNumericInput('1,2,3')).toBe('1,23')
  })

  it('recorta a los decimales pedidos, y con 0 corta en la coma', () => {
    expect(sanitizeNumericInput('1,23456', true, 2)).toBe('1,23')
    expect(sanitizeNumericInput('1234,56', true, 0)).toBe('1234')
  })
})

describe('capIntegerDigits', () => {
  it('recorta la parte entera a max dígitos, sin contar separadores', () => {
    expect(capIntegerDigits('1.234.567', 4)).toBe('1.234')
    expect(capIntegerDigits('-12345,67', 3)).toBe('-123,67')
  })

  it('sin recorte devuelve el texto tal cual', () => {
    expect(capIntegerDigits('1.234', 4)).toBe('1.234')
    expect(capIntegerDigits('123', undefined)).toBe('123')
    expect(capIntegerDigits('123', 0)).toBe('123')
  })
})

describe('texto del input', () => {
  it('enfocado no agrupa pero usa coma decimal', () => {
    expect(toEditableText(1234.5)).toBe('1234,5')
    expect(toEditableText('')).toBe('')
    expect(toEditableText(null)).toBe('')
    expect(toEditableText(Number.NaN)).toBe('')
  })

  it('sin formatted muestra el texto editable; con formatted, agrupado', () => {
    expect(formatForDisplay({ type: 'number' }, 1234.5)).toBe('1234,5')
    expect(formatForDisplay({ type: 'number', formatted: true }, 1234.5)).toBe('1.234,5')
    expect(formatForDisplay({ type: 'number', formatted: true, decimals: 0 }, 1234)).toBe('1.234')
    expect(formatForDisplay({ type: 'text', formatted: true }, 1234)).toBe('1234')
    expect(formatForDisplay({ type: 'number', formatted: true }, undefined)).toBe('')
  })
})
