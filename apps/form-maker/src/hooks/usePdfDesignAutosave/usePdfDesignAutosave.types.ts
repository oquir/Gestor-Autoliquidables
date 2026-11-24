import type { PdfDesign } from '../../types'

export interface PendingSave {
  design: PdfDesign
  version: number | null
}

export interface PdfAutosave {
  flush: () => void
  stop: () => void
}
