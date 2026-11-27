import type { FieldTypeCategory, FieldTypeDef } from '../../../types'

export interface PaletteSection {
  category: FieldTypeCategory
  heading: string
  fieldTypes: FieldTypeDef[]
}

export interface FieldPaletteProps {
  onAfterAdd?: () => void
}
