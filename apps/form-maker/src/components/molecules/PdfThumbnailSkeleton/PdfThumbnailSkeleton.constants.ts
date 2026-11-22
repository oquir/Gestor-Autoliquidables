// Silueta de una declaracion: titulo, encabezado a dos columnas, renglones y pie de firmas. Anchos en
// %, asi escala con la hoja.
export const SKELETON_ROWS: { id: string; cells: number[] }[] = [
  { id: 'title', cells: [70] },
  { id: 'head-1', cells: [48, 48] },
  { id: 'head-2', cells: [48, 48] },
  { id: 'row-1', cells: [100] },
  { id: 'row-2', cells: [100] },
  { id: 'row-3', cells: [64, 32] },
  { id: 'row-4', cells: [64, 32] },
  { id: 'row-5', cells: [64, 32] },
  { id: 'row-6', cells: [100] },
  { id: 'row-7', cells: [64, 32] },
  { id: 'row-8', cells: [64, 32] },
  { id: 'row-9', cells: [100] },
  { id: 'sign', cells: [48, 48] },
]

export const PAPER_CLASSES: string =
  'flex flex-col justify-between rounded-sm bg-surface p-[7%] shadow-sm ring-1 ring-border'

export const BAR_CLASSES: string =
  'h-[1.6%] min-h-[3px] rounded-full bg-border-strong/70 animate-pulse motion-reduce:animate-none dark:bg-border-strong/60'

export const CAPTION_BAR_CLASSES: string =
  'h-2.5 w-28 rounded-full bg-border-strong/70 animate-pulse motion-reduce:animate-none dark:bg-border-strong/60'
