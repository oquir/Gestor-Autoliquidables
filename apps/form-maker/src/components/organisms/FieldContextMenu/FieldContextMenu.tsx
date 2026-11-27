import { Trash6, Xmark } from 'reicon-react'
import {
  ACTION_TIER_CLASSES,
  ENTER_POP_CLASSES,
  WITHOUT_STEP_TABS_CLASSES,
} from '../../../constants'
import { useFieldContextMenu } from '../../../hooks/useFieldContextMenu/useFieldContextMenu'
import type { FieldContextMenuState } from '../../../types/fieldContextMenu'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { FieldEditorTabs } from '../FieldEditorTabs/FieldEditorTabs'
import { MoveToStepMenu } from '../MoveToStepMenu/MoveToStepMenu'

export function FieldContextMenu({
  menu,
  onClose,
}: {
  menu: FieldContextMenuState
  onClose: () => void
}) {
  const { field, activeTab, handleSelectTab, handleDelete, handleMoveToStep, position } =
    useFieldContextMenu({ menu, onClose })

  if (!field) return null

  return (
    <div
      style={{
        left: position.left,
        top: position.top,
        bottom: position.bottom,
        width: position.width,
        maxHeight: position.maxHeight,
      }}
      className={`fixed z-50 flex origin-top-left flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900 ${ENTER_POP_CLASSES}`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-neutral-800">
        <p className="truncate text-xs font-semibold text-slate-700 dark:text-neutral-200">
          {field.label}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <div className={WITHOUT_STEP_TABS_CLASSES}>
            <MoveToStepMenu
              onSelect={handleMoveToStep}
              tooltip="Mover el campo a otro paso"
              triggerClassName={ACTION_TIER_CLASSES.tertiary.compact}
              placement="down"
            />
          </div>
          <IconButton
            onClick={handleDelete}
            className="text-slate-300 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400 hover:cursor-pointer"
            aria-label="Borrar campo"
            title="Borrar campo"
          >
            <Trash6 size={16} />
          </IconButton>
          <IconButton
            onClick={onClose}
            className="text-slate-300 hover:text-slate-600 dark:text-neutral-600 dark:hover:text-neutral-300 hover:cursor-pointer"
            aria-label="Cerrar"
          >
            <Xmark size={18} weight="Filled" />
          </IconButton>
        </div>
      </div>

      <FieldEditorTabs
        field={field}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        bodyClassName="overflow-y-auto p-3 scrollbar-gutter-stable"
      />
    </div>
  )
}
