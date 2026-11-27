import { useState } from 'react'
import { Trash6 } from 'reicon-react'
import { ACTION_TIER_CLASSES } from '../../../constants'
import { useFormStore } from '../../../store'
import type { ContextMenuTab } from '../../../types'
import { IconButton } from '../../atoms'
import { BottomSheet } from '../../molecules'
import { FieldEditorTabs } from '../FieldEditorTabs'
import { MoveToStepMenu } from '../MoveToStepMenu'
import type { FieldEditorSheetProps } from './FieldEditorSheet.types'

// Hoja completa de edicion de un campo para el celular, compartida entre CanvasList y la vista
// Revisar (P3 y P9 de docs/Plan-Movil.md).
export function FieldEditorSheet({ field, onClose, onMoveToRow }: FieldEditorSheetProps) {
  const removeFields = useFormStore((state) => state.removeFields)
  const moveFieldsToStep = useFormStore((state) => state.moveFieldsToStep)
  const [activeTab, setActiveTab] = useState<ContextMenuTab>('attributes')

  return (
    <BottomSheet title={field.label || 'Editar campo'} size="full" onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <span className="truncate font-mono text-xs text-fg-muted">{field.name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {onMoveToRow && (
            <button
              type="button"
              onClick={onMoveToRow}
              className={ACTION_TIER_CLASSES.tertiary.compact}
            >
              Mover a fila…
            </button>
          )}
          <MoveToStepMenu
            onSelect={(target) => {
              moveFieldsToStep([field.id], target)
              onClose()
            }}
            tooltip="Mover el campo a otro paso"
            triggerClassName={ACTION_TIER_CLASSES.tertiary.compact}
            placement="down"
          />
          <IconButton
            onClick={() => {
              removeFields([field.id])
              onClose()
            }}
            className="text-fg-subtle transition-colors hover:text-danger"
            aria-label="Borrar campo"
            title="Borrar campo"
          >
            <Trash6 size={16} />
          </IconButton>
        </div>
      </div>

      <FieldEditorTabs
        field={field}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        bodyClassName="pt-3"
      />
    </BottomSheet>
  )
}
