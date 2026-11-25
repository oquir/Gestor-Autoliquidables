import { describe, expect, it } from 'vitest'
import { VALORES_POR_DEFECTO } from '../../src/constants/valoresAnuales'
import type { ValorAnual } from '../../src/types'
import { anioDeTexto, buscarValores } from '../../src/lib/valoresAnuales/valoresAnuales'

describe('buscarValores', () => {
  it('encuentra la fila del año', () => {
    expect(buscarValores(VALORES_POR_DEFECTO, 2026)?.uvt).toBe(52374)
    expect(buscarValores(VALORES_POR_DEFECTO, 2025)?.smmlv).toBe(1423500)
  })

  it('sin fila o con un año inválido, null', () => {
    expect(buscarValores(VALORES_POR_DEFECTO, 2019)).toBeNull()
    expect(buscarValores(VALORES_POR_DEFECTO, 0)).toBeNull()
    expect(buscarValores(VALORES_POR_DEFECTO, Number.NaN)).toBeNull()
  })
})

describe('anioDeTexto', () => {
  it('lee el año de AAAA/MM/DD; si no sirve, 0', () => {
    expect(anioDeTexto('2026/06/10')).toBe(2026)
    expect(anioDeTexto('')).toBe(0)
    expect(anioDeTexto('hoy')).toBe(0)
  })
})

describe('la tabla de fábrica', () => {
  it('UVT y salario mínimo suben año a año', () => {
    const ordered: ValorAnual[] = [...VALORES_POR_DEFECTO].sort((a, b) => a.anio - b.anio)

    for (let i = 1; i < ordered.length; i += 1) {
      expect(ordered[i].anio).toBe(ordered[i - 1].anio + 1)
      expect(ordered[i].uvt).toBeGreaterThan(ordered[i - 1].uvt)
      expect(ordered[i].smmlv).toBeGreaterThan(ordered[i - 1].smmlv)
    }
  })
})
