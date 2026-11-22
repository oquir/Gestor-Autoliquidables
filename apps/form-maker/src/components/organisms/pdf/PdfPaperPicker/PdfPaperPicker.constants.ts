import { ACTION_TIER_CLASSES, ENTER_POP_CLASSES } from '../../../../constants'
import type { PdfPaperTone } from '../../../../types'

// paper es el color real de la hoja en el lienzo (PdfCanvas.constants) e ink el del texto encima.
export const PAPER_OPTIONS: {
  tone: PdfPaperTone
  label: string
  hint: string
  paper: string
  ink: string
}[] = [
  { tone: 'white', label: 'Blanco', hint: 'Como sale impreso', paper: '#ffffff', ink: '#1f2937' },
  {
    tone: 'sepia',
    label: 'Sepia',
    hint: 'Beige, como una hoja reciclada',
    paper: '#f4ecd8',
    ink: '#4a3f2a',
  },
  {
    tone: 'dark',
    label: 'Oscuro',
    hint: 'Invertido; los colores conservan su tono',
    paper: '#121212',
    ink: '#e5e5e5',
  },
]

// Terciario, como Abrir: cambia la vista, no el PDF.
export const TRIGGER_CLASSES: string = ACTION_TIER_CLASSES.tertiary.regular

// Abre hacia abajo y pegado a la derecha: la cabecera esta arriba.
export const MENU_CLASSES: string = `absolute right-0 top-full z-30 mt-1 flex w-64 origin-top-right flex-col rounded-md border border-border bg-surface py-1 shadow-lg dark:bg-surface-raised ${ENTER_POP_CLASSES}`

export const ITEM_CLASSES: string =
  'flex items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-raised hover:cursor-pointer dark:hover:bg-surface-inset'

export const MENU_NOTE_CLASSES: string =
  'border-t border-border-subtle px-2.5 pt-1.5 pb-1 text-[10px] text-fg-muted'
