import {
  PDF_BACK_MARGIN_PX,
  PDF_PAPER_HEIGHT_PX,
  PDF_PAPER_WIDTH_PX,
  PDF_SHEET_HEIGHT_PX,
  PDF_WEB_PAGE_WIDTH_PX,
} from '../../constants'
import type { PdfDesign } from '../../types'
import { buildPdfHtml } from '../pdfFile'
import { renderVerticalTextPng } from '../pdfVerticalText'
import {
  PAPER_COLOR,
  RASTER_FAILED_MESSAGE,
  SVG_MIME,
  SVG_NAMESPACE,
} from './pdfThumbnail.constants'

// La hoja carta entera (con los 5 mm del back) y adentro la hoja 1 del .html. Lo que no cabe se
// recorta, como en el lienzo.
export function buildThumbnailSvg(design: PdfDesign, version: number | null): string {
  const html: string = buildPdfHtml(design, version, renderVerticalTextPng)
  const doc: Document = new DOMParser().parseFromString(html, 'text/html')
  const css: string = doc.head.querySelector('style')?.textContent ?? ''
  const sheetHeight: number = round(PDF_SHEET_HEIGHT_PX)

  // body trae el comentario del archivo y luego la raiz con una hoja por hijo: se deja la primera.
  const root: Element | null = doc.body.firstElementChild
  const frame: HTMLDivElement = doc.createElement('div')
  frame.setAttribute(
    'style',
    `width:${PDF_WEB_PAGE_WIDTH_PX}px;height:${sheetHeight}px;overflow:hidden;`,
  )
  const style: HTMLStyleElement = doc.createElement('style')
  style.textContent = css
  frame.append(style)
  if (root) {
    for (const sheet of Array.from(root.children).slice(1)) sheet.remove()
    frame.append(root)
  }

  // foreignObject pide XHTML bien formado: XMLSerializer cierra los <br>/<img> y escapa el CSS.
  const body: string = new XMLSerializer().serializeToString(frame)
  const width: number = round(PDF_PAPER_WIDTH_PX)
  const height: number = round(PDF_PAPER_HEIGHT_PX)
  const margin: number = round(PDF_BACK_MARGIN_PX)

  return [
    `<svg xmlns="${SVG_NAMESPACE}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${PAPER_COLOR}"/>`,
    `<foreignObject x="${margin}" y="${margin}" width="${PDF_WEB_PAGE_WIDTH_PX}" height="${sheetHeight}">`,
    body,
    '</foreignObject>',
    '</svg>',
  ].join('')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

// El SVG pintado una vez a escala 1:1 en un PNG. Achicado como vector, cada linea de 1 px queda en
// ~0,2 px y el motor decide si la dibuja: Firefox (Zen) borraba el borde exterior de las tablas, que
// en border-collapse cae mitad por fuera. Un mapa de bits se achica parejo.
// Trampa: se carga como data: y no como blob:. Chrome mancha el canvas con un blob: que trae
// foreignObject (toBlob lanza SecurityError) y con data: no. Si aun asi se mancha, queda el SVG.
export function rasterizeSvg(svg: string): Promise<Blob> {
  const width: number = Math.round(PDF_PAPER_WIDTH_PX)
  const height: number = Math.round(PDF_PAPER_HEIGHT_PX)
  const fallback: Blob = new Blob([svg], { type: SVG_MIME })

  return new Promise<Blob>((resolve, reject) => {
    const image: HTMLImageElement = new Image()
    image.onload = () => {
      const canvas: HTMLCanvasElement = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context: CanvasRenderingContext2D | null = canvas.getContext('2d')
      if (!context) {
        resolve(fallback)
        return
      }
      context.drawImage(image, 0, 0, width, height)
      try {
        canvas.toBlob((png) => resolve(png ?? fallback), 'image/png')
      } catch {
        resolve(fallback)
      }
    }
    image.onerror = () => reject(new Error(RASTER_FAILED_MESSAGE))
    image.src = `data:${SVG_MIME};charset=utf-8,${encodeURIComponent(svg)}`
  })
}
