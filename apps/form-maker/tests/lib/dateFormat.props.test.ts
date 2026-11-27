import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DATE_FORMAT_IDS } from '../../src/constants/dateFormats'
import {
  datePattern,
  formatIsoValue,
  maskDateText,
  parseDateText,
} from '../../src/lib/dateFormat/dateFormat'
import type { DateFormatId } from '../../src/types/fieldDate'

// Pruebas por propiedades (ver numberFormat.props.test.ts): complementan dateFormat.test.ts.

const FORMAT: fc.Arbitrary<DateFormatId> = fc.constantFrom(...DATE_FORMAT_IDS)

const DATE: fc.Arbitrary<Date> = fc.date({
  min: new Date('1900-01-01T00:00:00Z'),
  max: new Date('2100-12-31T23:59:00Z'),
  noInvalidDate: true,
})

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isoDateTime(date: Date): string {
  return date.toISOString().slice(0, 16)
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0')
}

// Oraculo aparte de aUtc (que usa Date.UTC): la regla del calendario escrita a mano
function daysInMonth(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

// El texto de un formato con los numeros que se quieran, existan o no como fecha
function writeDate(format: DateFormatId, year: number, month: number, day: number): string {
  return format
    .replace('YYYY', pad(year, 4))
    .replace('MM', pad(month, 2))
    .replace('DD', pad(day, 2))
}

describe('formatos de fecha (propiedades)', () => {
  it('cualquier fecha hace ida y vuelta en cualquier formato', () => {
    fc.assert(
      fc.property(DATE, FORMAT, (date: Date, format: DateFormatId) => {
        const iso: string = isoDate(date)
        const text: string | null = formatIsoValue(iso, format, false)

        expect(parseDateText(text ?? '', format)).toBe(iso)
      }),
    )
  })

  it('con hora también hace ida y vuelta', () => {
    fc.assert(
      fc.property(DATE, FORMAT, (date: Date, format: DateFormatId) => {
        const iso: string = isoDateTime(date)
        const pattern: string = datePattern(format, true)
        const text: string | null = formatIsoValue(iso, pattern, true)

        expect(parseDateText(text ?? '', pattern)).toBe(iso)
      }),
    )
  })

  it('la máscara no cambia un texto que ya está completo', () => {
    fc.assert(
      fc.property(DATE, FORMAT, fc.boolean(), (date: Date, format: DateFormatId, time: boolean) => {
        const pattern: string = datePattern(format, time)
        const text: string =
          formatIsoValue(time ? isoDateTime(date) : isoDate(date), pattern, time) ?? ''

        expect(maskDateText(text, pattern)).toBe(text)
      }),
    )
  })

  it('acepta una fecha si y solo si existe en el calendario', () => {
    fc.assert(
      fc.property(
        FORMAT,
        fc.integer({ min: 1900, max: 2100 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 31 }),
        (format: DateFormatId, year: number, month: number, day: number) => {
          const parsed: string | null = parseDateText(writeDate(format, year, month, day), format)
          const exists: boolean = day <= daysInMonth(year, month)

          expect(parsed).toBe(exists ? `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` : null)
        },
      ),
    )
  })

  it('una hora o un minuto fuera de rango no pasan', () => {
    fc.assert(
      fc.property(
        DATE,
        FORMAT,
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 0, max: 99 }),
        (date: Date, format: DateFormatId, hour: number, minute: number) => {
          const pattern: string = datePattern(format, true)
          const day: string = formatIsoValue(isoDate(date), format, false) ?? ''
          const text: string = `${day} ${pad(hour, 2)}:${pad(minute, 2)}`
          const valid: boolean = hour <= 23 && minute <= 59

          expect(parseDateText(text, pattern) !== null).toBe(valid)
        },
      ),
    )
  })

  it('leer cualquier texto nunca lanza y, si da algo, es una fecha interna bien formada', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 24 }),
        FORMAT,
        fc.boolean(),
        (text: string, format: DateFormatId, time: boolean) => {
          const parsed: string | null = parseDateText(text, datePattern(format, time))

          if (parsed !== null)
            expect(parsed).toMatch(time ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/)
        },
      ),
    )
  })
})
