import { PDF_THUMBNAIL_FRAME_STYLE } from '../../../constants'
import {
  BAR_CLASSES,
  CAPTION_BAR_CLASSES,
  PAPER_CLASSES,
  SKELETON_ROWS,
} from './PdfThumbnailSkeleton.constants'

// Mientras llega el chunk de la miniatura y se pinta la hoja. Mismo tamano y misma leyenda que la
// miniatura: al cambiar no salta nada.
export function PdfThumbnailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando la vista previa del PDF"
      className="flex flex-col items-center gap-1.5"
    >
      <div className={PAPER_CLASSES} style={PDF_THUMBNAIL_FRAME_STYLE}>
        {SKELETON_ROWS.map((row) => (
          <div
            key={row.id}
            className={`flex ${row.id === 'title' ? 'justify-center' : 'justify-between'}`}
          >
            {row.cells.map((width, index) => (
              <span key={index} className={BAR_CLASSES} style={{ width: `${width}%` }} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex h-[16.5px] items-center">
        <span className={CAPTION_BAR_CLASSES} />
      </div>
    </div>
  )
}
