import {
  CANVAS_PAN_ROOM_RATIO,
  DOCUMENT_GUTTER_PX,
  DOCUMENT_MAX_WIDTH_FOCUSED_PX,
  DOCUMENT_MAX_WIDTH_PX,
  DOCUMENT_VERTICAL_GUTTER_PX,
} from '../../constants/canvasViewport'
import type { ViewportInput, ViewportLayout } from '../../types/canvasViewport'

// Geometria del lienzo libre: tamano del documento, margen de paneo e inicio. Solo cuentas; medir y
// aplicar es de useCanvasViewport. El margen es scroll de verdad: rueda, barras y autoscroll de
// dnd-kit siguen funcionando.
export function getViewportLayout({
  portWidth,
  portHeight,
  zoom,
  panelsCollapsed,
  minDocumentWidth = 0,
}: ViewportInput): ViewportLayout | null {
  if (portWidth <= 0 || portHeight <= 0) return null

  const maxWidth: number = panelsCollapsed ? DOCUMENT_MAX_WIDTH_FOCUSED_PX : DOCUMENT_MAX_WIDTH_PX
  const documentWidth: number = Math.max(
    minDocumentWidth,
    Math.min(maxWidth, portWidth - 2 * DOCUMENT_GUTTER_PX),
  )
  const panX: number = Math.round(portWidth * CANVAS_PAN_ROOM_RATIO)
  const panY: number = Math.round(portHeight * CANVAS_PAN_ROOM_RATIO)
  // El puerto entero si el documento entra, o el documento escalado con su aire.
  const stageWidth: number = Math.max(portWidth, documentWidth * zoom + 2 * DOCUMENT_GUTTER_PX)
  const rootWidth: number = Math.round(stageWidth + 2 * panX)
  const padding: number = DOCUMENT_VERTICAL_GUTTER_PX + panY

  return {
    documentWidth,
    rootWidth,
    // Piso para que un documento corto a zoom bajo deje llegar al inicio.
    rootMinHeight: portHeight + 2 * panY,
    paddingTop: padding,
    paddingBottom: padding,
    homeLeft: Math.round((rootWidth - portWidth) / 2),
    homeTop: panY,
    // Revisar en el celular deja el documento en 976 px y lo achica con scale: su caja queda mas
    // ancha que la raiz, mx-auto ya no centra (la pega a la izquierda) y el scale encoge hacia el
    // centro de la caja, corrido a la derecha del de la raiz. Con este margen los dos centros
    // coinciden. En el escritorio el documento nunca pasa del puerto y queda en 0.
    documentShift: Math.min(0, (rootWidth - documentWidth) / 2),
  }
}
