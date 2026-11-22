import { useFormStore } from '../../../store'
import { SAVE_STATUS_DOT_CLASSES } from './SaveStatus.constants'

// Pie del panel derecho: el estado del guardado y su hora, en las dos pestanas.
export function SaveStatus() {
  const lastSavedAt = useFormStore((state) => state.lastSavedAt)
  const savedLabel: string = lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : '—'

  return (
    <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-fg-muted">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ring-[3px] ${
          lastSavedAt ? SAVE_STATUS_DOT_CLASSES.saved : SAVE_STATUS_DOT_CLASSES.unsaved
        }`}
      />
      {lastSavedAt ? 'Último guardado' : 'Sin guardar'}
      <span className="ml-auto font-medium tabular-nums text-fg-soft">{savedLabel}</span>
    </div>
  )
}
