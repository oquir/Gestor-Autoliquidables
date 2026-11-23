import { lazy, Suspense } from 'react'
import { PDF_THUMBNAIL_FRAME_STYLE } from '../../../constants'
import { ErrorBoundary } from '../../atoms/ErrorBoundary/ErrorBoundary'
import { PanelBlock } from '../../molecules/PanelBlock/PanelBlock'
import { PdfThumbnailSkeleton } from '../../molecules/PdfThumbnailSkeleton/PdfThumbnailSkeleton'
import { ERROR_CLASSES, STAGE_CLASSES } from './PdfPreviewBlock.constants'

// La miniatura vive del lado del PDF (lib/pdfFile y compania): chunk aparte, como el disenador.
const PdfThumbnail = lazy(() =>
  import('../pdf/PdfThumbnail/PdfThumbnail').then((module) => ({ default: module.PdfThumbnail })),
)

// Ultimo bloque de Proyecto: toma el alto que sobra y la miniatura crece hasta llenarlo. Con el panel
// abierto es la entrada al disenador; plegado, la entrada es el boton PDF del chip.
export function PdfPreviewBlock() {
  return (
    <PanelBlock title="Vista previa del PDF" fill>
      <div className={STAGE_CLASSES}>
        <ErrorBoundary
          fallback={() => (
            <p className={ERROR_CLASSES} style={PDF_THUMBNAIL_FRAME_STYLE}>
              No se pudo mostrar la vista previa. Diseñar PDF sigue funcionando.
            </p>
          )}
        >
          <Suspense fallback={<PdfThumbnailSkeleton />}>
            <PdfThumbnail />
          </Suspense>
        </ErrorBoundary>
      </div>
    </PanelBlock>
  )
}
