import { describe, expect, it } from 'vitest'
import { ZOOM_MAX, ZOOM_MIN } from '../../src/constants/canvasZoom'
import {
  mergeIds,
  normalizeRect,
  pointInRect,
  rectsIntersect,
  sameIdSet,
  toggleId,
  withoutIds,
} from '../../src/lib/canvasSelection/canvasSelection'
import { getViewportLayout } from '../../src/lib/canvasViewport/canvasViewport'
import {
  canZoomIn,
  canZoomOut,
  clampZoom,
  formatZoom,
  getCanvasScale,
  wheelZoom,
  zoomIn,
  zoomOut,
} from '../../src/lib/canvasZoom/canvasZoom'
import { createBurstGate, sameDocument, toHistorySnapshot } from '../../src/lib/history/history'
import {
  adjacentStep,
  describeActiveStep,
  orderedSteps,
} from '../../src/lib/stepNavigation/stepNavigation'
import type { CanvasTarget, HistorySnapshot } from '../../src/types'
import { makeField, makeStep } from '../helpers/canvasFixtures'

describe('historial', () => {
  const base: HistorySnapshot = {
    formSteps: [makeStep('Paso', [makeField('text', 'a')])],
    introModal: { steps: [] },
    formScript: '',
    setupConfig: {
      isComplete: true,
      formType: 'industria_comercio',
      hasIntroModal: false,
      introModalSteps: 0,
    },
    activeCanvas: { type: 'formStep', stepId: 'paso-Paso' },
    selectedFieldIds: [],
  }

  it('la selección y el paso activo no crean un paso de historial', () => {
    expect(
      sameDocument(base, {
        ...base,
        selectedFieldIds: ['id-a'],
        activeCanvas: { type: 'introStep', stepId: 'x' },
      }),
    ).toBe(true)
  })

  it('el documento se compara por contenido: rearmarlo igual no es un cambio', () => {
    const rebuilt: HistorySnapshot = { ...base, formSteps: structuredClone(base.formSteps) }

    expect(sameDocument(base, rebuilt)).toBe(true)
  })

  it('una clave con undefined y una ausente dicen lo mismo', () => {
    const withUndefined: HistorySnapshot = {
      ...base,
      formSteps: [{ ...base.formSteps[0], subtitle: undefined }],
    }

    expect(sameDocument(base, withUndefined)).toBe(true)
  })

  it('cualquier cambio del documento sí cuenta', () => {
    expect(sameDocument(base, { ...base, formScript: 'const A = 1;' })).toBe(false)
    expect(
      sameDocument(base, { ...base, formSteps: [makeStep('Paso', [makeField('text', 'b')])] }),
    ).toBe(false)
    expect(sameDocument(base, { ...base, introModal: { steps: [] } })).toBe(true)
  })

  it('toHistorySnapshot se queda solo con lo que guarda el historial', () => {
    const snapshot = toHistorySnapshot({ ...base, canvasZoom: 2 } as HistorySnapshot)

    expect(Object.keys(snapshot).sort()).toEqual([
      'activeCanvas',
      'formScript',
      'formSteps',
      'introModal',
      'selectedFieldIds',
      'setupConfig',
    ])
  })

  it('la ráfaga deja pasar el primer cambio y traga los que siguen dentro de la ventana', () => {
    let now: number = 0
    const calls: number[] = []
    const gate = createBurstGate(500, () => now)
    const record = gate.wrap((value: number) => calls.push(value))

    record(1)
    now = 200
    record(2)
    now = 600
    record(3)
    now = 1200
    record(4)
    gate.reset()
    now = 1201
    record(5)

    // El 3 cae a 400 ms del 2: la ventana se corre con cada cambio tragado.
    expect(calls).toEqual([1, 4, 5])
  })
})

describe('selección múltiple', () => {
  it('normaliza el rectángulo y detecta toques', () => {
    const rect = normalizeRect(10, 20, 0, 5)

    expect(rect).toEqual({ left: 0, top: 5, right: 10, bottom: 20 })
    expect(rectsIntersect(rect, { left: 10, top: 20, right: 30, bottom: 40 })).toBe(true)
    expect(rectsIntersect(rect, { left: 11, top: 0, right: 30, bottom: 40 })).toBe(false)
    expect(pointInRect(0, 5, rect)).toBe(true)
    expect(pointInRect(-1, 5, rect)).toBe(false)
  })

  it('conjuntos de ids sin repetir y con la misma referencia si nada cambia', () => {
    const ids: string[] = ['a', 'b']

    expect(sameIdSet(ids, ['b', 'a'])).toBe(true)
    expect(sameIdSet(ids, ['a'])).toBe(false)
    expect(toggleId(ids, 'a')).toEqual(['b'])
    expect(toggleId(ids, 'c')).toEqual(['a', 'b', 'c'])
    expect(mergeIds(ids, ['b', 'c', 'c'])).toEqual(['a', 'b', 'c'])
    expect(withoutIds(ids, new Set(['x']))).toBe(ids)
    expect(withoutIds(ids, new Set(['a']))).toEqual(['b'])
  })
})

describe('zoom del lienzo', () => {
  it('a pasos de 10% sin errores de coma flotante y dentro de los topes', () => {
    // 0.7 + 0.1 da 0.7999999999999999: sin el redondeo nunca se llegaria exacto al tope.
    expect(zoomIn(0.7)).toBe(0.8)
    expect(zoomOut(0.8)).toBe(0.7)
    let zoom: number = ZOOM_MIN
    while (canZoomIn(zoom)) zoom = zoomIn(zoom)
    expect(zoom).toBe(ZOOM_MAX)
    expect(zoomIn(ZOOM_MAX)).toBe(ZOOM_MAX)
    expect(zoomOut(ZOOM_MIN)).toBe(ZOOM_MIN)
    expect(clampZoom(Number.NaN)).toBe(ZOOM_MIN)
    expect(canZoomIn(ZOOM_MAX)).toBe(false)
    expect(canZoomOut(1)).toBe(true)
  })

  it('la rueda es continua; el porcentaje se redondea', () => {
    expect(wheelZoom(1, -100)).toBeGreaterThan(1)
    expect(wheelZoom(1, 100)).toBeLessThan(1)
    expect(formatZoom(0.755)).toBe('76%')
  })

  it('la escala sale del DOM: ancho pintado sobre ancho de maquetación', () => {
    const element = {
      offsetWidth: 800,
      getBoundingClientRect: () => ({ width: 1200 }),
    } as unknown as HTMLElement

    expect(getCanvasScale(element)).toBe(1.5)
    expect(getCanvasScale(null)).toBe(1)
    expect(getCanvasScale({ offsetWidth: 0 } as HTMLElement)).toBe(1)
  })
})

describe('geometría del lienzo libre', () => {
  it('sin puerto no hay cuentas', () => {
    expect(
      getViewportLayout({ portWidth: 0, portHeight: 600, zoom: 1, panelsCollapsed: false }),
    ).toBeNull()
  })

  it('el documento cabe en el puerto y el inicio queda centrado', () => {
    const layout = getViewportLayout({
      portWidth: 1200,
      portHeight: 800,
      zoom: 1,
      panelsCollapsed: false,
    })

    expect(layout).not.toBeNull()
    if (!layout) return
    expect(layout.documentWidth).toBeLessThanOrEqual(1200)
    expect(layout.rootWidth).toBeGreaterThan(1200)
    expect(layout.homeLeft).toBe(Math.round((layout.rootWidth - 1200) / 2))
    expect(layout.rootMinHeight).toBeGreaterThan(800)
  })

  it('con más zoom el escenario crece; con los paneles cerrados el documento puede ser más ancho', () => {
    const normal = getViewportLayout({
      portWidth: 3000,
      portHeight: 800,
      zoom: 1,
      panelsCollapsed: false,
    })
    const zoomed = getViewportLayout({
      portWidth: 1200,
      portHeight: 800,
      zoom: 1.5,
      panelsCollapsed: false,
    })
    const small = getViewportLayout({
      portWidth: 1200,
      portHeight: 800,
      zoom: 1,
      panelsCollapsed: false,
    })
    const focused = getViewportLayout({
      portWidth: 3000,
      portHeight: 800,
      zoom: 1,
      panelsCollapsed: true,
    })

    expect(zoomed?.rootWidth).toBeGreaterThan(small?.rootWidth ?? 0)
    expect(focused?.documentWidth).toBeGreaterThanOrEqual(normal?.documentWidth ?? 0)
  })
})

describe('Ctrl + flechas entre pasos', () => {
  const steps: CanvasTarget[] = orderedSteps(
    [makeStep('Uno', []), makeStep('Dos', [])],
    [{ stepId: 'intro', title: 'Intro', rows: [] }],
  )

  it('primero el modal y después el formulario', () => {
    expect(steps).toEqual([
      { type: 'introStep', stepId: 'intro' },
      { type: 'formStep', stepId: 'paso-Uno' },
      { type: 'formStep', stepId: 'paso-Dos' },
    ])
  })

  it('de a un paso y sin dar la vuelta', () => {
    expect(adjacentStep(steps, steps[0], 1)).toEqual(steps[1])
    expect(adjacentStep(steps, steps[2], 1)).toBeNull()
    expect(adjacentStep(steps, steps[0], -1)).toBeNull()
    expect(adjacentStep(steps, { type: 'formStep', stepId: 'borrado' }, 1)).toBeNull()
  })

  it('describeActiveStep numera dentro de su grupo', () => {
    const formSteps = [makeStep('Uno', []), { ...makeStep('Dos', []), hidden: true }]
    const introSteps = [{ stepId: 'intro', title: ' Intro ', rows: [] }]

    expect(
      describeActiveStep(formSteps, introSteps, { type: 'formStep', stepId: 'paso-Dos' }),
    ).toEqual({ isIntro: false, number: 2, total: 2, title: 'Dos', hidden: true })
    expect(
      describeActiveStep(formSteps, introSteps, { type: 'introStep', stepId: 'intro' }),
    ).toEqual({ isIntro: true, number: 1, total: 1, title: 'Intro', hidden: false })
    expect(
      describeActiveStep(formSteps, introSteps, { type: 'formStep', stepId: 'borrado' }),
    ).toBeNull()
  })
})
