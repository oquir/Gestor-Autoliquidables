import { useFormStore } from '../../../store'
import { Tooltip } from '../../atoms'
import { SAVE_STATUS_DOT_CLASSES } from './SaveStatus.constants'
import type { SaveStatusProps } from './SaveStatus.types'

// Pie del panel derecho: el estado del guardado y su hora, en las dos pestanas. compact: solo el
// punto, con la hora en el globo (la barra de arriba del celular).
export function SaveStatus({ compact = false }: SaveStatusProps) {
  const lastSavedAt = useFormStore((state) => state.lastSavedAt)
  const savedLabel: string = lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : '—'
  const dot = (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ring-[3px] ${
        lastSavedAt ? SAVE_STATUS_DOT_CLASSES.saved : SAVE_STATUS_DOT_CLASSES.unsaved
      }`}
    />
  )

  if (compact) {
    const summary: string = lastSavedAt ? `Último guardado · ${savedLabel}` : 'Sin guardar'

    return (
      <Tooltip content={summary}>
        <span
          role="status"
          aria-label={summary}
          className="flex h-8 w-6 items-center justify-center"
        >
          {dot}
        </span>
      </Tooltip>
    )
  }

  return (
    <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-fg-muted">
      {dot}
      {lastSavedAt ? 'Último guardado' : 'Sin guardar'}
      <span className="ml-auto font-medium tabular-nums text-fg-soft">{savedLabel}</span>
    </div>
  )
}
