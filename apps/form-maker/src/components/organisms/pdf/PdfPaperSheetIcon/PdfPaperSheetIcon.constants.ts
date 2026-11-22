// Proporcion carta. sm en el boton de la cabecera, md en el menu.
export const SHEET_SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'h-[15px] w-3 gap-[2px] p-[2px]',
  md: 'h-[26px] w-5 gap-[3px] p-[3px]',
}

export const SHEET_CLASSES: string =
  'flex shrink-0 flex-col rounded-[2px] shadow-sm ring-1 ring-black/15 dark:ring-white/25'

// Un titulo corto y tres renglones: se lee como una hoja escrita.
export const LINE_WIDTHS: string[] = ['60%', '100%', '100%', '75%']

export const LINE_CLASSES: string = 'h-px shrink-0 rounded-full'
