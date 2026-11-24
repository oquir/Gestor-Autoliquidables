import { use, useMemo } from 'react'
import { PDF_THUMBNAIL_FRAME_STYLE } from '../../../../constants'
import { FilePdf } from 'reicon-react'
import { readPdfEntryParams, resolvePdfTaxType, taxTypeLabel } from '../../../../lib/pdfDesign'
import { readPdfThumbnail } from '../../../../lib/pdfThumbnail'
import { useFormStore } from '../../../../store'
import type { PdfTaxType, PdfThumbnail as PdfThumbnailData } from '../../../../types'
import { Tooltip } from '../../../atoms'
import {
  CAPTION_CLASSES,
  EMPTY_BUTTON_CLASSES,
  EMPTY_NOTE_CLASSES,
  PAPER_BUTTON_CLASSES,
  PAPER_HINT_CLASSES,
} from './PdfThumbnail.constants'

// La hoja 1 de la plantilla, sin valores: los {Variables} a la vista ayudan a reconocerla. Se lee
// al montar; el panel se remonta al volver del disenador, cuyo Volver guarda lo pendiente antes de
// cerrar (este render corre antes que el desmontaje del disenador).
export function PdfThumbnail() {
  const formType = useFormStore((state) => state.setupConfig.formType)
  const setPdfDesignerOpen = useFormStore((state) => state.setPdfDesignerOpen)

  // El mismo impuesto que abrira el disenador.
  const taxType: PdfTaxType | null = useMemo(
    () => resolvePdfTaxType(formType, readPdfEntryParams(window.location.search)),
    [formType],
  )
  // Mientras se pinta, espera en el Suspense de PdfPreviewBlock. La promesa viene de una cache: es la
  // misma en cada render.
  const pending: Promise<PdfThumbnailData | null> | null = useMemo(
    () => (taxType ? readPdfThumbnail(taxType) : null),
    [taxType],
  )
  const thumbnail: PdfThumbnailData | null = pending ? use(pending) : null

  if (!taxType) {
    return (
      <p className={EMPTY_NOTE_CLASSES} style={PDF_THUMBNAIL_FRAME_STYLE}>
        El formulario no tiene impuesto definido, así que no tiene plantilla de PDF.
      </p>
    )
  }

  const label: string = taxTypeLabel(taxType)

  if (!thumbnail) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPdfDesignerOpen(true)}
          className={EMPTY_BUTTON_CLASSES}
          style={PDF_THUMBNAIL_FRAME_STYLE}
        >
          <FilePdf size={20} />
          <span className="font-medium">Sin diseño todavía</span>
          <span>Diseñar el PDF de {label}</span>
        </button>
      </div>
    )
  }

  const details: string[] = [label, thumbnail.version ? `v${thumbnail.version}` : 'Sin subir']
  if (thumbnail.sheetCount > 1) details.push(`Hoja 1 de ${thumbnail.sheetCount}`)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Tooltip content={`Abrir Diseñar PDF · Plantilla de ${label}`}>
        <button
          type="button"
          onClick={() => setPdfDesignerOpen(true)}
          aria-label={`Abrir Diseñar PDF · Plantilla de ${label}`}
          className={PAPER_BUTTON_CLASSES}
          style={PDF_THUMBNAIL_FRAME_STYLE}
        >
          <img
            src={thumbnail.url}
            alt=""
            draggable={false}
            className="block h-auto w-full select-none"
          />
          <span aria-hidden className={PAPER_HINT_CLASSES}>
            Abrir diseñador
          </span>
        </button>
      </Tooltip>
      <p className={CAPTION_CLASSES}>{details.join(' · ')}</p>
    </div>
  )
}
