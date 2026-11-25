import { describe, expect, it } from 'vitest'
import { DATE_FORMAT_IDS } from '../../src/constants/dateFormats'
import { boundExpression, boundMessage, isCompleteBound } from '../../src/lib/dateBound/dateBound'
import {
  datePattern,
  datePlaceholder,
  displayDateText,
  formatIsoValue,
  maskDateText,
  parseDateText,
} from '../../src/lib/dateFormat/dateFormat'

describe('maskDateText', () => {
  it('pone los separadores solos y solo cuando ya hay un dígito después', () => {
    expect(maskDateText('31', 'DD/MM/YYYY')).toBe('31')
    expect(maskDateText('310', 'DD/MM/YYYY')).toBe('31/0')
    expect(maskDateText('31032026', 'DD/MM/YYYY')).toBe('31/03/2026')
    expect(maskDateText('2026a03-31', 'YYYY-MM-DD')).toBe('2026-03-31')
    expect(maskDateText('202603319999', 'YYYYMMDD')).toBe('20260331')
  })
})

describe('parseDateText', () => {
  it('pasa el texto completo al valor interno AAAA-MM-DD', () => {
    expect(parseDateText('31/03/2026', 'DD/MM/YYYY')).toBe('2026-03-31')
    expect(parseDateText('03/31/2026', 'MM/DD/YYYY')).toBe('2026-03-31')
    expect(parseDateText('20260331', 'YYYYMMDD')).toBe('2026-03-31')
  })

  it('con hora la exige y la valida', () => {
    const pattern: string = datePattern('DD/MM/YYYY', true)

    expect(pattern).toBe('DD/MM/YYYY HH:mm')
    expect(parseDateText('31/03/2026 08:30', pattern)).toBe('2026-03-31T08:30')
    expect(parseDateText('31/03/2026 24:00', pattern)).toBeNull()
    expect(parseDateText('31/03/2026', pattern)).toBeNull()
  })

  it('incompleto o una fecha que no existe da null', () => {
    expect(parseDateText('31/03/20', 'DD/MM/YYYY')).toBeNull()
    expect(parseDateText('31/02/2026', 'DD/MM/YYYY')).toBeNull()
  })
})

describe('formatIsoValue y displayDateText', () => {
  it('formatea el valor interno; los segundos se descartan', () => {
    expect(formatIsoValue('2026-03-31', 'DD.MM.YYYY', false)).toBe('31.03.2026')
    expect(formatIsoValue('2026-03-31T08:30:15', 'YYYY/MM/DD HH:mm', true)).toBe('2026/03/31 08:30')
  })

  it('no inventa la hora que el usuario no puso', () => {
    expect(formatIsoValue('2026-03-31', 'DD/MM/YYYY HH:mm', true)).toBeNull()
    expect(formatIsoValue('31/03/2026', 'DD/MM/YYYY', false)).toBeNull()
  })

  it('lo incompleto se muestra tal cual', () => {
    expect(displayDateText('2026-03', 'DD/MM/YYYY', false)).toBe('2026-03')
  })

  it('ida y vuelta en los siete formatos', () => {
    for (const format of DATE_FORMAT_IDS) {
      const text: string | null = formatIsoValue('2026-03-31', format, false)

      expect(text).not.toBeNull()
      expect(parseDateText(text ?? '', format)).toBe('2026-03-31')
    }
    expect(DATE_FORMAT_IDS).toHaveLength(7)
  })

  it('el placeholder habla en español', () => {
    expect(datePlaceholder('DD/MM/YYYY HH:mm')).toBe('dd/mm/aaaa hh:mm')
  })
})

describe('límites de fecha', () => {
  it('uno a medio escribir no viaja', () => {
    expect(isCompleteBound(undefined)).toBe(false)
    expect(isCompleteBound({ kind: 'fixed', date: '2026-03' })).toBe(false)
    expect(isCompleteBound({ kind: 'relative', amount: 0, unit: 'days', direction: 'past' })).toBe(
      false,
    )
    expect(isCompleteBound({ kind: 'today' })).toBe(true)
  })

  it('el mensaje dice la regla, no la fecha', () => {
    expect(boundMessage({ kind: 'today' }, 'max', 'La fecha')).toBe(
      'La fecha no puede ser posterior a hoy',
    )
    expect(boundMessage({ kind: 'fixed', date: '2026-01-31' }, 'min', 'La fecha')).toBe(
      'La fecha no puede ser anterior al 31/01/2026',
    )
    expect(
      boundMessage(
        { kind: 'relative', amount: 1, unit: 'years', direction: 'past' },
        'min',
        'La fecha',
      ),
    ).toBe('La fecha no puede estar a más de 1 año en el pasado')
    expect(
      boundMessage(
        { kind: 'relative', amount: 3, unit: 'days', direction: 'future' },
        'min',
        'La fecha',
      ),
    ).toBe('La fecha tiene que estar al menos 3 días en el futuro')
  })

  it('un límite relativo corre contra el reloj de quien llena, en hora local', () => {
    const run = (expression: string): string => new Function(`return ${expression};`)()
    const today = new Date()
    const local: string = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')

    expect(boundExpression({ kind: 'fixed', date: '2026-01-31' })).toBe('"2026-01-31"')
    expect(run(boundExpression({ kind: 'today' }))).toBe(local)
    expect(
      run(boundExpression({ kind: 'relative', amount: 1, unit: 'days', direction: 'future' })),
    ).not.toBe(local)
  })
})
