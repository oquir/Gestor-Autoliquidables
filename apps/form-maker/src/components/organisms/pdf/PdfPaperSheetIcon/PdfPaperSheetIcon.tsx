import {
  LINE_CLASSES,
  LINE_WIDTHS,
  SHEET_CLASSES,
  SHEET_SIZE_CLASSES,
} from './PdfPaperSheetIcon.constants'
import type { PdfPaperSheetIconProps } from './PdfPaperSheetIcon.types'

export function PdfPaperSheetIcon({ paper, ink, size }: PdfPaperSheetIconProps) {
  return (
    <span
      aria-hidden
      className={`${SHEET_CLASSES} ${SHEET_SIZE_CLASSES[size]}`}
      style={{ backgroundColor: paper }}
    >
      {LINE_WIDTHS.map((width, index) => (
        <span key={index} className={LINE_CLASSES} style={{ width, backgroundColor: ink }} />
      ))}
    </span>
  )
}
