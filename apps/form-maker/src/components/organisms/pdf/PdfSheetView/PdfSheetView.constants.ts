import type { CSSProperties } from 'react'
import type { SheetOverflow } from './PdfSheetView.types'
import { PDF_PAPER_HEIGHT_PX, PDF_PAPER_WIDTH_PX } from '../../../../constants'

export const NO_OVERFLOW: SheetOverflow = { bottom: 0, right: 0 }

export const PAPER_SIZE: CSSProperties = {
  width: PDF_PAPER_WIDTH_PX,
  height: PDF_PAPER_HEIGHT_PX,
}
