import { useDraggable } from '@dnd-kit/core'
import { memo, type NamedExoticComponent } from 'react'
import { FIELD_TYPE_ICONS } from '../../../constants'
import type { PaletteChipContentProps, PaletteChipProps } from './PaletteChip.types'

export function PaletteChip({ fieldType, onAdd }: PaletteChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${fieldType.type}`,
    data: { source: 'palette', fieldType },
  })

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(fieldType)}
      className={`flex h-full min-h-18 w-full cursor-grab select-none flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-3 text-center text-[11px] font-medium leading-tight text-slate-600 transition-[color,background-color,border-color,translate,box-shadow] hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md active:cursor-grabbing dark:border-neutral-700/70 dark:bg-neutral-800/60 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700/70 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <PaletteChipContent fieldType={fieldType} />
    </button>
  )
}

function PaletteChipContentBase({ fieldType }: PaletteChipContentProps) {
  const Icon = FIELD_TYPE_ICONS[fieldType.type]

  return (
    <>
      {Icon && <Icon size={20} className="text-slate-400 dark:text-neutral-400" />}
      <span>{fieldType.label}</span>
    </>
  )
}

// Aparte de useDraggable: ese hook repinta las fichas en cada cambio de estado de un arrastre,
// aunque no sean la arrastrada (auditoria O2).
const PaletteChipContent: NamedExoticComponent<PaletteChipContentProps> =
  memo(PaletteChipContentBase)
