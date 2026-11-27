import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  capIntegerDigits,
  formatNumber,
  parseFormattedNumber,
  sanitizeNumericInput,
} from '../../src/lib/numberFormat/numberFormat'

// Pruebas por propiedades: fast-check inventa las entradas (100 por prueba) y busca una que rompa
// la regla. Si la encuentra la achica y muestra la semilla (seed); fc.assert(..., { seed, path })
// repite exactamente ese caso. Complementan las de numberFormat.test.ts, no las reemplazan.

const DECIMALS: fc.Arbitrary<number | undefined> = fc.constantFrom(undefined, 0, 1, 2, 3, 4)

// Lo pequeno y lo grande por separado: con un solo rango casi nunca saldrian valores cerca de cero.
const ANY_AMOUNT: fc.Arbitrary<number> = fc.oneof(
  fc.double({ min: -1, max: 1, noNaN: true }),
  fc.double({ min: -1e12, max: 1e12, noNaN: true }),
)

// Lo que alguien puede teclear o pegar en un input numerico.
const TYPED_TEXT: fc.Arbitrary<string> = fc.string({
  unit: fc.constantFrom('0', '1', '5', '9', '.', ',', '-', ' ', 'a', '$', 'e'),
  maxLength: 16,
})

describe('formatNumber y parseFormattedNumber (propiedades)', () => {
  it('un entero hace ida y vuelta exacta', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e15, max: 1e15 }), (value: number) => {
        expect(parseFormattedNumber(formatNumber(value))).toBe(value)
      }),
    )
  })

  it('con decimales, lo que vuelve difiere a lo sumo en el redondeo', () => {
    fc.assert(
      fc.property(ANY_AMOUNT, DECIMALS, (value: number, decimals: number | undefined) => {
        const back: number | null = parseFormattedNumber(formatNumber(value, decimals))
        const step: number = 10 ** -(decimals ?? 4)
        // Cerca de 1e12 la coma flotante ya no tiene 4 decimales exactos: se suma su propio error
        const floatError: number = Math.abs(value) * Number.EPSILON * 4

        expect(back).not.toBeNull()
        expect(Math.abs((back ?? 0) - value)).toBeLessThanOrEqual(step / 2 + floatError + 1e-12)
      }),
    )
  })

  it('con decimals siempre muestra exactamente esos decimales', () => {
    fc.assert(
      fc.property(ANY_AMOUNT, fc.integer({ min: 1, max: 4 }), (value: number, decimals: number) => {
        const shown: string = formatNumber(value, decimals)

        expect(shown.split(',')[1]).toHaveLength(decimals)
      }),
    )
  })

  // BUG (hallazgo 4.7 de docs/Hallazgos-Pruebas.md): el mismo de numberFormat.test.ts, buscado
  // con cualquier numero. Un negativo que se redondea a cero sale "-0". it.fails avisa cuando se
  // corrija.
  it.fails('nunca muestra un cero negativo', () => {
    fc.assert(
      fc.property(ANY_AMOUNT, DECIMALS, (value: number, decimals: number | undefined) => {
        expect(formatNumber(value, decimals)).not.toMatch(/^-0(,0*)?$/)
      }),
    )
  })

  it('leer cualquier texto nunca lanza: da null o un numero finito', () => {
    fc.assert(
      fc.property(fc.oneof(TYPED_TEXT, fc.string()), (text: string) => {
        const parsed: number | null = parseFormattedNumber(text)

        expect(parsed === null || Number.isFinite(parsed)).toBe(true)
      }),
    )
  })
})

describe('sanitizeNumericInput y capIntegerDigits (propiedades)', () => {
  it('lo que deja pasar el input solo tiene dígitos, separadores y a lo sumo un signo al inicio', () => {
    fc.assert(
      fc.property(TYPED_TEXT, fc.boolean(), (raw: string, allowNegative: boolean) => {
        const clean: string = sanitizeNumericInput(raw, allowNegative)

        expect(clean).toMatch(/^-?[\d.,]*$/)
        expect(clean.split(',').length).toBeLessThanOrEqual(2)
        if (!allowNegative) expect(clean.startsWith('-')).toBe(false)
      }),
    )
  })

  // BUG (hallazgo 5.1 de docs/Hallazgos-Pruebas.md, lo encontro esta prueba): el filtro deja un
  // punto despues de la coma ("1,234.56" pegado a la inglesa, "0,5." por un dedo) y el parser no lo
  // lee. PreviewNumberInput manda '' al estado: el usuario ve el numero y el campo queda vacio.
  // Pendiente de confirmar con el usuario; it.fails avisa cuando se corrija.
  it.fails('un número pegado a la inglesa ("1,234.56") se puede leer', () => {
    expect(parseFormattedNumber(sanitizeNumericInput('1,234.56'))).not.toBeNull()
  })

  it.fails('lo que deja pasar el input, con cualquier tecleo, se puede leer', () => {
    fc.assert(
      fc.property(TYPED_TEXT, fc.boolean(), (raw: string, allowNegative: boolean) => {
        const clean: string = sanitizeNumericInput(raw, allowNegative)
        if (!/\d/.test(clean)) return

        expect(parseFormattedNumber(clean)).not.toBeNull()
      }),
    )
  })

  it('con decimals nunca deja más decimales de los pedidos', () => {
    fc.assert(
      fc.property(TYPED_TEXT, fc.integer({ min: 0, max: 4 }), (raw: string, decimals: number) => {
        const clean: string = sanitizeNumericInput(raw, true, decimals)
        const after: string = clean.split(',')[1] ?? ''

        expect(after.replace(/\D/g, '').length).toBeLessThanOrEqual(decimals)
        if (decimals === 0) expect(clean).not.toContain(',')
      }),
    )
  })

  it('capIntegerDigits nunca deja más dígitos enteros que el tope y no toca los decimales', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1e15, max: 1e15 }),
        fc.integer({ min: 1, max: 15 }),
        (value: number, max: number) => {
          const text: string = formatNumber(value, 2)
          const capped: string = capIntegerDigits(text, max)
          const [whole, rest] = capped.split(',')

          expect(whole.replace(/\D/g, '').length).toBeLessThanOrEqual(max)
          expect(rest).toBe(text.split(',')[1])
        },
      ),
    )
  })
})
