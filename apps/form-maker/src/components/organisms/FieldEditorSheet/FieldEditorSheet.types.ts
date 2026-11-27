import type { CanvasField } from '../../../types'

export interface FieldEditorSheetProps {
  field: CanvasField
  onClose: () => void
  onMoveToRow?: () => void
}
