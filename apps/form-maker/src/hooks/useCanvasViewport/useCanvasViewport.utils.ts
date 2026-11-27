import { getCanvasScale } from '../../lib'
import type { PinchPoint } from '../../types'
import type { PortSize, ViewAnchor } from './useCanvasViewport.types'

// clientWidth y clientHeight y no el rect: sin la barra de scroll, que es lo que de verdad se ve.
export function readPortSize(port: HTMLElement): PortSize {
  return { width: port.clientWidth, height: port.clientHeight }
}

export function samePortSize(a: PortSize | null, b: PortSize): boolean {
  return a !== null && a.width === b.width && a.height === b.height
}

// Se divide por la escala leida del DOM, no por el zoom del store: da igual si el transform nuevo
// ya se aplico. Sin point, el centro del puerto; con point (cliente), ese punto queda quieto.
export function captureAnchor(
  port: HTMLElement,
  content: HTMLElement,
  point?: PinchPoint | null,
): ViewAnchor {
  const portRect: DOMRect = port.getBoundingClientRect()
  const rect: DOMRect = content.getBoundingClientRect()
  const scale: number = getCanvasScale(content)
  const viewX: number = point ? point.x - portRect.left : port.clientWidth / 2
  const viewY: number = point ? point.y - portRect.top : port.clientHeight / 2

  return {
    x: (portRect.left + viewX - rect.left) / scale,
    y: (portRect.top + viewY - rect.top) / scale,
    viewX,
    viewY,
  }
}

// Corrige X ademas de Y: la raiz cambia de ancho con el zoom y el documento va centrado.
export function restoreAnchor(port: HTMLElement, content: HTMLElement, anchor: ViewAnchor): void {
  const portRect: DOMRect = port.getBoundingClientRect()
  const rect: DOMRect = content.getBoundingClientRect()
  const scale: number = getCanvasScale(content)

  port.scrollLeft += rect.left + anchor.x * scale - (portRect.left + anchor.viewX)
  port.scrollTop += rect.top + anchor.y * scale - (portRect.top + anchor.viewY)
}
