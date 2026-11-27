import { describe, expect, it } from 'vitest'
import {
  LAYOUT_DESKTOP_MIN_WIDTH,
  LAYOUT_MEDIA_QUERIES,
  LAYOUT_PHONE_MAX_WIDTH,
} from '../../src/constants'
import { layoutModeFor } from '../../src/lib/layoutMode/layoutMode'

// El ancho decide el layout (docs/Plan-Movil.md, seccion 0): bajo 640 celular, de 640 a 1279
// cajones, desde 1280 el escritorio de siempre.

describe('layoutModeFor', () => {
  it('pone los celulares de prueba del plan en phone', () => {
    for (const width of [360, 390, 412]) expect(layoutModeFor(width)).toBe('phone')
  })

  it('pone las tablets en compact', () => {
    for (const width of [768, 820, 1180]) expect(layoutModeFor(width)).toBe('compact')
  })

  it('deja el escritorio en desktop desde 1280, incluida la tablet de 1280 en horizontal', () => {
    for (const width of [1280, 1366, 1600]) expect(layoutModeFor(width)).toBe('desktop')
  })

  it('corta justo en los dos bordes', () => {
    expect(layoutModeFor(LAYOUT_PHONE_MAX_WIDTH - 1)).toBe('phone')
    expect(layoutModeFor(LAYOUT_PHONE_MAX_WIDTH)).toBe('compact')
    expect(layoutModeFor(LAYOUT_DESKTOP_MIN_WIDTH - 1)).toBe('compact')
    expect(layoutModeFor(LAYOUT_DESKTOP_MIN_WIDTH)).toBe('desktop')
  })

  it('acepta anchos con decimales (zoom del navegador)', () => {
    expect(layoutModeFor(639.5)).toBe('phone')
    expect(layoutModeFor(1279.9)).toBe('compact')
  })

  it('trata un ancho invalido como celular, el layout que siempre entra', () => {
    expect(layoutModeFor(Number.NaN)).toBe('phone')
    expect(layoutModeFor(-1)).toBe('phone')
  })
})

describe('LAYOUT_MEDIA_QUERIES', () => {
  it('escucha exactamente los dos cortes de layoutModeFor', () => {
    expect(LAYOUT_MEDIA_QUERIES).toEqual([
      `(min-width: ${LAYOUT_PHONE_MAX_WIDTH}px)`,
      `(min-width: ${LAYOUT_DESKTOP_MIN_WIDTH}px)`,
    ])
  })

  it('usa los mismos cortes que max-sm y xl de Tailwind', () => {
    expect(LAYOUT_PHONE_MAX_WIDTH).toBe(640)
    expect(LAYOUT_DESKTOP_MIN_WIDTH).toBe(1280)
  })
})
