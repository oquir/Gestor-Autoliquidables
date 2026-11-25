// Información exógena: el reporte de retenciones practicadas que el agente retenedor le entrega al municipio
// Va una fila por renglón de detalle de cada declaración de ReteICA vigente.
import type { Declaration, StatementRow } from '../types'
import { downloadBlob } from './files'
import { createXlsx } from './excel'
import { documentNumber, normalize, paymentStatusLabel, periodLabel } from './format'
import type { TableColumn } from './reports'

/** Columnas del Excel, en el orden de las filas. */
export const EXOGENA_COLUMNS: TableColumn[] = [
  { title: 'Año gravable', width: 13 },
  { title: 'Tipo de documento', width: 20 },
  { title: 'Número de documento', width: 22 },
  { title: 'Agente retenedor', width: 35 },
  { title: 'Radicado', width: 18 },
  { title: 'Periodo', width: 20 },
  { title: 'Fecha de presentación', width: 21 },
  { title: 'Base de retención', width: 20, format: 'pesos' },
  { title: 'Tarifa (‰)', width: 10 },
  { title: 'Valor retenido', width: 16, format: 'pesos' },
  { title: 'Estado de pago', width: 20 },
]

const detailLines = (d: Declaration) =>
  d.lines.filter((line) => Number.parseInt(line.code, 10) < 16)

//Extrae concepto, base numérica y tarifa desde el concepto
function parseLineDetail(rawConcept: string) {
  const cleanDetail = rawConcept.replace(/\u00A0/g, ' ')

  const rateMatch = cleanDetail.match(/a\s+(\d+(?:[.,]\d+)?)\s+por\s+mil/i)
  const rate = rateMatch ? Number.parseFloat(rateMatch[1].replace(',', '.')) : 0

  const baseMatch = cleanDetail.match(/sobre\s+([\d.,]+)(\s+millones)?/i)
  let base = 0
  if (baseMatch) {
    const numStr = baseMatch[2]
      ? baseMatch[1].replace(',', '.')
      : baseMatch[1].replace(/\./g, '').replace(',', '.')
    const parsed = Number.parseFloat(numStr)
    base = Number.isNaN(parsed) ? 0 : Math.round(parsed * (baseMatch[2] ? 1_000_000 : 1))
  }

  return { base, rate }
}

/** Descarga la información exógena del contribuyente: una fila por renglón de detalle de cada ReteICA vigente. */
export function downloadExogenous(reteica: StatementRow[] ) {
  const payer = reteica[0]?.d.taxpayer
  if (!payer) return
  const rows = reteica.flatMap(({ d, status }) =>
    detailLines(d).map((line) => {
        const { base, rate } = parseLineDetail(line.concept)
      return [
      d.fiscalYear,
      d.taxpayer.documentType, 
      documentNumber(d.taxpayer),
      d.taxpayer.name,
      d.number,
      periodLabel(d),
      d.filingDate,
      base,
      rate,
      line.value,
      paymentStatusLabel[status],
      ]
    }),
  )
  const workbook = createXlsx({
    name: 'Información exógena',
    rows: [EXOGENA_COLUMNS.map((c) => c.title), ...rows],
    widths: EXOGENA_COLUMNS.map((c) => c.width),
    textColumns: [8, 10],
    pesoColumns: EXOGENA_COLUMNS.flatMap((c, i) => (c.format === 'pesos' ? [i] : [])),
  })
  downloadBlob(
    workbook,
    `exogena_${documentNumber(payer)}_${normalize(payer.name).replace(/\s+/g, '-')}.xlsx`,
  )
}