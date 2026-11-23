import type { PdfTaxType, PdfThumbnail, StoredPdfDesign } from '../../types'
import { loadPdfDesign } from '../pdfDesignBank'
import { buildThumbnailSvg, rasterizeSvg } from './pdfThumbnail.utils'

// Miniatura de la hoja 1 para el panel derecho: el mismo .html de buildPdfHtml metido en un SVG
// (<foreignObject>), pintado a un PNG que se muestra como <img>. Imagen y no iframe (decision del
// usuario): se pinta una vez, sin scripts ni documento vivo. Trampa: un SVG usado como imagen no carga
// nada externo, asi que una <img src="https://..."> de la plantilla sale en blanco (los base64 si
// salen). Toca el DOM (DOMParser, canvas, blob:); fuera de lib/index.ts, como el resto de pdf*.

// Promesas y no valores: el componente las lee con use() y espera en el Suspense del bloque. Tienen
// que ser estables; por eso la cache y la constante para "sin diseno".
const NO_THUMBNAIL: Promise<null> = Promise.resolve(null)

// Una sola entrada: el panel se remonta al cambiar de pestana o volver del disenador, y sin esto
// cada vuelta repinta la hoja con todos los base64.
let cached: { key: string; promise: Promise<PdfThumbnail> } | null = null

// null (resuelto) si el impuesto no tiene diseno guardado.
export function readPdfThumbnail(taxType: PdfTaxType): Promise<PdfThumbnail | null> {
  const stored: StoredPdfDesign | null = loadPdfDesign(taxType)
  if (!stored) return NO_THUMBNAIL

  const version: number | null = stored.version ?? null
  const key: string = `${taxType}|${stored.savedAt}|${version ?? ''}`
  if (cached?.key === key) return cached.promise

  // La anterior ya no la muestra nadie: el <img> que la usaba se cambia con la nueva.
  if (cached)
    void cached.promise.then(
      (old) => URL.revokeObjectURL(old.url),
      () => undefined,
    )

  const svg: string = buildThumbnailSvg(stored.design, version)
  const promise: Promise<PdfThumbnail> = rasterizeSvg(svg).then((image) => ({
    taxType,
    url: URL.createObjectURL(image),
    sheetCount: stored.design.sheets.length,
    version,
  }))
  cached = { key, promise }
  return promise
}
