import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, ZOOM_WHEEL_FACTOR } from '../../constants'
import type { PinchFrame, PinchPoint } from '../../types'

// Aritmetica del zoom. Pura salvo getCanvasScale, que lee el DOM a proposito: el zoom vive en CSS.

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return ZOOM_MIN

  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

// Dos decimales: 0.1 + 0.6 da 0.7000000000000001 y nunca seria igual al tope.
export function zoomIn(zoom: number): number {
  return clampZoom(Math.round((zoom + ZOOM_STEP) * 100) / 100)
}

export function zoomOut(zoom: number): number {
  return clampZoom(Math.round((zoom - ZOOM_STEP) * 100) / 100)
}

// Continua y no a pasos: un pellizco del trackpad manda muchos eventos chicos.
export function wheelZoom(zoom: number, deltaY: number): number {
  return clampZoom(zoom * (1 - deltaY * ZOOM_WHEEL_FACTOR))
}

export function canZoomIn(zoom: number): boolean {
  return zoom < ZOOM_MAX
}

export function canZoomOut(zoom: number): boolean {
  return zoom > ZOOM_MIN
}

export function formatZoom(zoom: number): string {
  return `${Math.round(zoom * 100)}%`
}

// rect (escalado) / offsetWidth (maquetacion) = escala acumulada. Del DOM y no del store: no
// depende de pasarla y da exactamente 1 sin zoom. El error de redondeo (~0,05%) es despreciable.
export function getCanvasScale(element: HTMLElement | null): number {
  if (!element) return 1

  const layoutWidth: number = element.offsetWidth
  if (layoutWidth === 0) return 1

  return element.getBoundingClientRect().width / layoutWidth
}

// Pellizco con dos dedos (B10 de docs/Plan-Movil.md). La escala es contra la distancia del
// comienzo, no contra el cuadro anterior: sumar razones cuadro a cuadro acumularia redondeos.
export function pinchDistance(a: PinchPoint, b: PinchPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

// Dedos que empezaron encima uno del otro (o datos rotos) no escalan: dividir por casi cero
// dispararia el zoom al tope.
export function pinchFrame(startDistance: number, a: PinchPoint, b: PinchPoint): PinchFrame {
  const midpoint: PinchPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const distance: number = pinchDistance(a, b)
  const isUsable: boolean =
    Number.isFinite(startDistance) && startDistance > 1 && Number.isFinite(distance)

  return { scale: isUsable ? distance / startDistance : 1, midpoint }
}

export function pinchZoom(startZoom: number, scale: number): number {
  return clampZoom(startZoom * scale)
}
