import { memo, type MouseEvent, type NamedExoticComponent, type ReactNode } from 'react'
import {
  PDF_CANVAS_ATTRIBUTE,
  PDF_CANVAS_CLASS,
  PDF_TABLE_CLASS,
  PDF_VARIABLE_PATTERN,
} from '../../../../constants'
import { pdfComponentHtml } from '../../../../lib/pdfComponents'
import { cellStyleMap, tableStyleMap } from '../../../../lib/pdfDesign'
import { sanitizePdfCanvasHtml, sanitizePdfHtml } from '../../../../lib/pdfHtml'
import { renderVerticalTextPng } from '../../../../lib/pdfVerticalText'
import type { PdfCell, PdfCellContent, PdfFontFamily } from '../../../../types'
import type { CellHtml, PdfTableRowProps, PdfTableViewProps } from './PdfTableView.types'

// Se llama a si misma para las tablas anidadas; el clic de una celda de adentro no sube a la de
// afuera.
function PdfTableViewBase({ table, fontFamily, selectedIds, onSelectCell }: PdfTableViewProps) {
  return (
    <table
      className={[PDF_TABLE_CLASS, table.className].filter(Boolean).join(' ')}
      style={tableStyleMap(table)}
    >
      <colgroup>
        {table.columns.map((column) => (
          <col key={column.id} style={column.width ? { width: column.width } : undefined} />
        ))}
      </colgroup>
      <tbody>
        {table.rows.map((row) => (
          <PdfTableRow
            key={row.id}
            row={row}
            tableId={table.id}
            fontFamily={fontFamily}
            selectedIds={selectedIds}
            onSelectCell={onSelectCell}
          />
        ))}
      </tbody>
    </table>
  )
}

function PdfTableRowBase({
  row,
  tableId,
  fontFamily,
  selectedIds,
  onSelectCell,
}: PdfTableRowProps) {
  function handleClick(event: MouseEvent<HTMLTableCellElement>, cell: PdfCell): void {
    event.stopPropagation()
    onSelectCell(tableId, cell.id, event.shiftKey)
  }

  return (
    <tr style={row.height ? { height: row.height } : undefined}>
      {row.cells.map((cell) => {
        const className: string = [
          cell.className,
          PDF_CANVAS_CLASS.cell,
          selectedIds.has(cell.id) ? PDF_CANVAS_CLASS.selected : '',
        ]
          .filter(Boolean)
          .join(' ')

        // Saneado y dentro del shadow root: su <style> no alcanza a la app.
        const html: CellHtml | null = cellHtml(cell.content, fontFamily)
        if (html !== null) {
          return (
            <td
              key={cell.id}
              {...cellAttributes(tableId, cell.id)}
              colSpan={cell.colSpan}
              rowSpan={cell.rowSpan}
              className={className}
              style={cellStyleMap(cell)}
              onClick={(event) => handleClick(event, cell)}
              dangerouslySetInnerHTML={html}
            />
          )
        }

        return (
          <td
            key={cell.id}
            {...cellAttributes(tableId, cell.id)}
            colSpan={cell.colSpan}
            rowSpan={cell.rowSpan}
            className={className}
            style={cellStyleMap(cell)}
            onClick={(event) => handleClick(event, cell)}
          >
            {cell.content.kind === 'table' ? (
              <PdfTableView
                table={cell.content.table}
                fontFamily={fontFamily}
                selectedIds={selectedIds}
                onSelectCell={onSelectCell}
              />
            ) : cell.content.kind === 'text' ? (
              renderText(cell.content.text)
            ) : null}
          </td>
        )
      })}
    </tr>
  )
}

// Una fila por componente: el store del PDF conserva las filas que no cambian (lib/pdfDesignEdit),
// asi que al escribir en una celda solo se repinta su fila. La tabla ICA tiene casi todo en una
// sola tabla: memoizar solo la tabla no alcanzaba.
const PdfTableRow: NamedExoticComponent<PdfTableRowProps> = memo(PdfTableRowBase)

// Con la seleccion y el clic estables (PdfCanvas), el zoom y lo que cambia en otra tabla no la
// repintan.
export const PdfTableView: NamedExoticComponent<PdfTableViewProps> = memo(PdfTableViewBase)

// React 19 compara dangerouslySetInnerHTML por identidad: un {__html} nuevo en cada render reescribe
// el innerHTML aunque el texto sea el mismo, y cada clic de seleccion (repinta todas las filas)
// volvia a crear todas las imagenes del documento. Uno por contenido: el store conserva los que no
// cambian.
const CELL_HTML: WeakMap<PdfCellContent, { fontFamily: PdfFontFamily; html: CellHtml }> =
  new WeakMap()

// HTML libre o de componente, saneado igual que al publicar.
function cellHtml(content: PdfCellContent, fontFamily: PdfFontFamily): CellHtml | null {
  if (content.kind !== 'html' && content.kind !== 'component') return null

  const cached: { fontFamily: PdfFontFamily; html: CellHtml } | undefined = CELL_HTML.get(content)
  if (cached && cached.fontFamily === fontFamily) return cached.html

  const html: CellHtml = { __html: buildCellHtml(content, fontFamily) }
  CELL_HTML.set(content, { fontFamily, html })
  return html
}

function buildCellHtml(
  content: Extract<PdfCellContent, { kind: 'html' | 'component' }>,
  fontFamily: PdfFontFamily,
): string {
  if (content.kind === 'html') return sanitizePdfCanvasHtml(content.html) || '&nbsp;'
  const html: string = pdfComponentHtml(content.component, {
    mode: 'canvas',
    fontFamily,
    renderVerticalText: renderVerticalTextPng,
  })
  return sanitizePdfHtml(html) || '&nbsp;'
}

// Lo que lee el arrastre para saber en que celda esta el puntero.
function cellAttributes(tableId: string, cellId: string): Record<string, string> {
  return { [PDF_CANVAS_ATTRIBUTE.table]: tableId, [PDF_CANVAS_ATTRIBUTE.cell]: cellId }
}

// Las {variables} resaltadas. Una celda vacia lleva un espacio duro: sin el, la fila se aplasta.
function renderText(text: string): ReactNode {
  if (text === '') return ' '

  return text.split(PDF_VARIABLE_PATTERN).map((part, index) =>
    PDF_VARIABLE_PATTERN.test(part) ? (
      <span key={index} className={PDF_CANVAS_CLASS.variable}>
        {part}
      </span>
    ) : (
      part
    ),
  )
}
