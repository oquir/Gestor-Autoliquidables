import type { PdfFontFamily, PdfRow, PdfTable } from '../../../../types'

export interface PdfTableViewProps {
  table: PdfTable
  // El texto vertical sin fuente propia se dibuja con esta.
  fontFamily: PdfFontFamily
  selectedIds: ReadonlySet<string>
  onSelectCell: (tableId: string, cellId: string, extend: boolean) => void
}

export interface PdfTableRowProps {
  row: PdfRow
  tableId: string
  fontFamily: PdfFontFamily
  selectedIds: ReadonlySet<string>
  onSelectCell: (tableId: string, cellId: string, extend: boolean) => void
}
