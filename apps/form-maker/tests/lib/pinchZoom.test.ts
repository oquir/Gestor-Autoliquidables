import { describe, expect, it } from 'vitest'
import { ZOOM_MAX, ZOOM_MIN } from '../../src/constants'
import { pinchDistance, pinchFrame, pinchZoom } from '../../src/lib/canvasZoom/canvasZoom'

// Pellizcar para hacer zoom (B10 de docs/Plan-Movil.md): la escala es contra el comienzo del gesto
// y el ancla es el punto medio de los dedos.

describe('pinchDistance', () => {
  it('mide la recta entre los dos dedos', () => {
    expect(pinchDistance({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50)
  })
})

describe('pinchFrame', () => {
  it('separar los dedos al doble da escala 2', () => {
    expect(pinchFrame(100, { x: 0, y: 0 }, { x: 200, y: 0 }).scale).toBe(2)
  })

  it('juntarlos a la mitad da escala 0,5', () => {
    expect(pinchFrame(100, { x: 0, y: 0 }, { x: 0, y: 50 }).scale).toBe(0.5)
  })

  it('el ancla es el punto medio de los dedos', () => {
    expect(pinchFrame(100, { x: 100, y: 300 }, { x: 300, y: 100 }).midpoint).toEqual({
      x: 200,
      y: 200,
    })
  })

  it('dedos que empezaron juntos no escalan', () => {
    expect(pinchFrame(0, { x: 0, y: 0 }, { x: 80, y: 0 }).scale).toBe(1)
    expect(pinchFrame(0.5, { x: 0, y: 0 }, { x: 80, y: 0 }).scale).toBe(1)
  })

  it('datos rotos no escalan', () => {
    expect(pinchFrame(Number.NaN, { x: 0, y: 0 }, { x: 80, y: 0 }).scale).toBe(1)
    expect(pinchFrame(100, { x: 0, y: 0 }, { x: Number.NaN, y: 0 }).scale).toBe(1)
  })
})

describe('pinchZoom', () => {
  it('multiplica el zoom del comienzo por la escala', () => {
    expect(pinchZoom(1, 1.2)).toBeCloseTo(1.2)
    expect(pinchZoom(0.8, 1.25)).toBeCloseTo(1)
  })

  it('respeta los topes del lienzo', () => {
    expect(pinchZoom(1, 10)).toBe(ZOOM_MAX)
    expect(pinchZoom(1, 0.01)).toBe(ZOOM_MIN)
  })

  it('es contra el comienzo: el mismo gesto da el mismo zoom en cualquier cuadro', () => {
    const start: number = 0.9
    const frames: number[] = [1.1, 1.3, 1.2].map((scale) => pinchZoom(start, scale))
    expect(frames.at(-1)).toBeCloseTo(start * 1.2)
  })
})
