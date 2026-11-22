import type { PdfTaxType } from './pdfDesign'

// La miniatura de la hoja 1 que muestra el panel derecho. url es un blob: de un PNG (o del SVG si el
// navegador no deja pintarlo).
export interface PdfThumbnail {
  taxType: PdfTaxType
  url: string
  sheetCount: number
  version: number | null
}
