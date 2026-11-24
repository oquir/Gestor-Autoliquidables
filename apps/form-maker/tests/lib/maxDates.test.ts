import { describe, expect, it } from 'vitest'
import type { ReglaAnio } from '../../src/types'
import {
  aUtc,
  buscarFechaLimite,
  conFechaAnual,
  diasEntre,
  digitoDe,
  enTexto,
  fechasEsperadas,
  generarFechasPorDefecto,
  generarReglasAnuales,
  mesesOFraccion,
} from '../../src/lib/maxDates/maxDates'

describe('digitoDe', () => {
  it('toma el último o el primer dígito del documento', () => {
    expect(digitoDe('900123456', 'ultimo_digito')).toBe(6)
    expect(digitoDe('900123456', 'primer_digito')).toBe(9)
    expect(digitoDe('  1032456780  ', 'ultimo_digito')).toBe(0)
  })

  it('con el DV pegado lee el DV: el NIT va sin él', () => {
    // El campo numero_documento no lleva el DV (NIT_PATTERN); si alguien lo pega, el ultimo
    // caracter ya no es un digito del NIT.
    expect(digitoDe('900123456-7', 'ultimo_digito')).toBe(7)
  })

  it('vacío o sin dígito en la punta da null, no 0', () => {
    expect(digitoDe('', 'ultimo_digito')).toBeNull()
    expect(digitoDe('   ', 'primer_digito')).toBeNull()
    expect(digitoDe('90012345A', 'ultimo_digito')).toBeNull()
    expect(digitoDe('A90012345', 'primer_digito')).toBeNull()
  })
})

describe('enTexto', () => {
  it('formatea AAAA/MM/DD con ceros a la izquierda', () => {
    expect(enTexto(new Date(2026, 0, 5))).toBe('2026/01/05')
    expect(enTexto(new Date(2025, 11, 31))).toBe('2025/12/31')
  })
})

describe('aUtc', () => {
  it('lee barras y guiones como el mismo día', () => {
    expect(aUtc('2025/03/31')).toBe(Date.UTC(2025, 2, 31))
    expect(aUtc('2025-03-31')).toBe(Date.UTC(2025, 2, 31))
    expect(aUtc('2025/3/1')).toBe(Date.UTC(2025, 2, 1))
  })

  it('rechaza fechas que no existen o con otra forma', () => {
    expect(aUtc('2025/02/31')).toBeNull()
    expect(aUtc('2025/13/01')).toBeNull()
    expect(aUtc('31/03/2025')).toBeNull()
    expect(aUtc('')).toBeNull()
  })
})

describe('diasEntre y mesesOFraccion', () => {
  it('cuenta días completos, negativo si es anterior', () => {
    expect(diasEntre('2026/03/31', '2026/04/01')).toBe(1)
    expect(diasEntre('2026/03/31', '2026/06/10')).toBe(71)
    expect(diasEntre('2026/03/31', '2026/03/01')).toBe(-30)
    expect(diasEntre('2026/02/30', '2026/03/01')).toBeNull()
  })

  it('un día tarde ya es un mes', () => {
    expect(mesesOFraccion('2026/03/31', '2026/04/01')).toBe(1)
  })

  it('el mismo día o antes no es tarde', () => {
    expect(mesesOFraccion('2026/03/31', '2026/03/31')).toBe(0)
    expect(mesesOFraccion('2026/03/31', '2026/03/01')).toBe(0)
  })

  it('cuenta por calendario y no dividiendo por 30', () => {
    expect(mesesOFraccion('2026/01/31', '2026/02/28')).toBe(1)
    expect(mesesOFraccion('2026/03/31', '2026/04/30')).toBe(1)
    expect(mesesOFraccion('2026/03/31', '2026/06/10')).toBe(3)
    // Un ano completo son 12 meses, no 13 (365 / 30 > 12).
    expect(mesesOFraccion('2025/03/31', '2026/03/31')).toBe(12)
    expect(mesesOFraccion('2025/03/31', '2026/04/01')).toBe(13)
  })

  it('con un vencimiento a mitad de mes, los días que pasan del día límite son otra fracción', () => {
    // Con el limite en un 31 esta rama no se ve nunca: el dia de llegada no puede superarlo.
    expect(mesesOFraccion('2026/03/10', '2026/03/11')).toBe(1)
    expect(mesesOFraccion('2026/03/10', '2026/04/10')).toBe(1)
    expect(mesesOFraccion('2026/03/10', '2026/04/11')).toBe(2)
    expect(mesesOFraccion('2026/11/16', '2027/01/20')).toBe(3)
  })
})

describe('buscarFechaLimite', () => {
  const reglas: ReglaAnio[] = [
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
      fechas: [
        { periodo: 1, digito: 0, fecha: '2026/03/10' },
        { periodo: 1, digito: 6, fecha: '2026/03/16' },
        { periodo: 2, digito: 6, fecha: '2026/05/18' },
      ],
    },
  ]

  it('sin dígito, por año y periodo', () => {
    expect(buscarFechaLimite(reglas, 2025, 1, '')).toBe('2026/03/31')
    expect(buscarFechaLimite(reglas, 2025, 2, '900123456')).toBeUndefined()
  })

  it('con dígito, por el del documento', () => {
    expect(buscarFechaLimite(reglas, 2026, 1, '900123456')).toBe('2026/03/16')
    expect(buscarFechaLimite(reglas, 2026, 2, '900123456')).toBe('2026/05/18')
    expect(buscarFechaLimite(reglas, 2026, 1, '900123450')).toBe('2026/03/10')
  })

  it('sin año, sin documento o sin la combinación, no hay fecha', () => {
    expect(buscarFechaLimite(reglas, 2024, 1, '900123456')).toBeUndefined()
    expect(buscarFechaLimite(reglas, 2026, 1, '')).toBeUndefined()
    expect(buscarFechaLimite(reglas, 2026, 1, '900123451')).toBeUndefined()
  })
})

describe('tabla por defecto', () => {
  it('genera los diez años gravables anteriores, venciendo al año siguiente', () => {
    const reglas: ReglaAnio[] = generarReglasAnuales(2026, 10, 1, '03/31')

    expect(reglas).toHaveLength(10)
    expect(reglas[0].anio).toBe(2016)
    expect(reglas[9]).toEqual({
      anio: 2025,
      periodicidad: 'anual',
      tipoDigito: 'ninguno',
      fechas: [{ periodo: 1, fecha: '2026/03/31' }],
    })
  })

  it('solo ICA trae fechas: retención y autorretención no se inventan', () => {
    const fechas = generarFechasPorDefecto(2026)

    expect(fechas.ica).toHaveLength(10)
    expect(fechas.reteica).toEqual([])
    expect(fechas.autoretencionIca).toEqual([])
  })

  it('fechasEsperadas multiplica periodos por diez si valida por dígito', () => {
    expect(
      fechasEsperadas({ anio: 2025, periodicidad: 'anual', tipoDigito: 'ninguno', fechas: [] }),
    ).toBe(1)
    expect(
      fechasEsperadas({
        anio: 2025,
        periodicidad: 'mensual',
        tipoDigito: 'ultimo_digito',
        fechas: [],
      }),
    ).toBe(120)
  })

  it('conFechaAnual cambia solo el año anual sin dígito pedido', () => {
    const fechas = generarFechasPorDefecto(2026)
    const cambiadas = conFechaAnual(fechas, 'ica', 2025, '2026/04/15')

    expect(buscarFechaLimite(cambiadas.ica, 2025, 1, '')).toBe('2026/04/15')
    expect(buscarFechaLimite(cambiadas.ica, 2024, 1, '')).toBe('2025/03/31')
    expect(cambiadas.ica[0]).toBe(fechas.ica[0])
  })
})
