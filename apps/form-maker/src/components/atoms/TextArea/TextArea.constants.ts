import type { TextareaVariant } from './Textarea.types'

export const VARIANT_CLASSES: Record<TextareaVariant, string> = {
  default:
    'px-2.5 py-1.5 text-sm pointer-coarse:text-base text-slate-700 dark:bg-neutral-800 dark:text-neutral-200',
  code: 'px-3 py-2 font-mono text-xs pointer-coarse:text-base text-slate-100 bg-slate-900 dark:bg-neutral-950',
}
