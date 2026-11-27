import { useState } from 'react'
import { Grid, Layers, Plus, Redo, Trash6, Undo, VectorSquare, Xmark } from 'reicon-react'
import {
  CANVAS_TOOL_BUTTON_ACTIVE_CLASSES,
  CANVAS_TOOL_BUTTON_INACTIVE_CLASSES,
} from '../../../constants/uiClasses'
import { useCanvasReveal } from '../../../hooks/useCanvasReveal/useCanvasReveal'
import { useFormHistory } from '../../../hooks/useFormHistory/useFormHistory'
import { getActiveGroups, getActiveRows, useFormStore } from '../../../store/formStore'
import type { CanvasRow, RepeatableGroup } from '../../../types/formStructure'
import { BottomSheet } from '../../molecules/BottomSheet/BottomSheet'
import { ViewModeSwitch } from '../../molecules/ViewModeSwitch/ViewModeSwitch'
import { FieldPalette } from '../FieldPalette/FieldPalette'
import { MoveToStepMenu } from '../MoveToStepMenu/MoveToStepMenu'
import {
  BAR_CLASSES,
  ITEM_CLASSES,
  SELECTION_ACTIONS_CLASSES,
  SELECTION_ACTION_CLASSES,
  SELECTION_BAR_CLASSES,
  SELECTION_CLOSE_CLASSES,
  SELECTION_COUNT_CLASSES,
  SELECTION_DANGER_CLASSES,
  STRUCTURE_BUTTON_CLASSES,
  STRUCTURE_GRID_CLASSES,
} from './PhoneBottomBar.constants'
import type { PhoneBottomSheet } from './PhoneBottomBar.types'

export function PhoneBottomBar() {
  const canvasTool = useFormStore((state) => state.canvasTool)
  const setCanvasTool = useFormStore((state) => state.setCanvasTool)
  const viewMode = useFormStore((state) => state.canvasViewMode)
  const setViewMode = useFormStore((state) => state.setCanvasViewMode)
  const isIntro = useFormStore((state) => state.activeCanvas.type === 'introStep')
  const selectedFieldIds = useFormStore((state) => state.selectedFieldIds)
  const selectField = useFormStore((state) => state.selectField)
  const removeFields = useFormStore((state) => state.removeFields)
  const moveFieldsToStep = useFormStore((state) => state.moveFieldsToStep)
  const addRowToActiveCanvas = useFormStore((state) => state.addRowToActiveCanvas)
  const addGroupToActiveStep = useFormStore((state) => state.addGroupToActiveStep)
  const { canUndo, canRedo, undo, redo } = useFormHistory()
  const reveal = useCanvasReveal()
  const [sheet, setSheet] = useState<PhoneBottomSheet | null>(null)
  const isSelecting: boolean = canvasTool === 'select'
  const showSelectionBar: boolean =
    viewMode === 'canvas' &&
    (selectedFieldIds.length > 1 || (isSelecting && selectedFieldIds.length > 0))

  function revealLastRow(): void {
    const rows: CanvasRow[] = getActiveRows(useFormStore.getState())
    const lastRow: CanvasRow | undefined = rows[rows.length - 1]
    if (lastRow) reveal({ kind: 'row', id: lastRow.id })
  }

  function revealAddedField(): void {
    const state = useFormStore.getState()
    const rows: CanvasRow[] = getActiveRows(state)
    const selectedId: string | undefined = state.selectedFieldIds[0]
    const targetRow: CanvasRow | undefined =
      (selectedId ? rows.find((row) => row.fields.some((f) => f.id === selectedId)) : undefined) ??
      rows[rows.length - 1]
    if (targetRow) reveal({ kind: 'row', id: targetRow.id })
  }

  function revealLastGroup(): void {
    const groups: RepeatableGroup[] = getActiveGroups(useFormStore.getState())
    const lastGroup: RepeatableGroup | undefined = groups[groups.length - 1]
    if (lastGroup) reveal({ kind: 'band', id: lastGroup.id })
  }

  return (
    <>
      {showSelectionBar && (
        <div role="region" aria-label="Acciones de selección" className={SELECTION_BAR_CLASSES}>
          <span className={SELECTION_COUNT_CLASSES}>
            {selectedFieldIds.length === 1
              ? '1 seleccionado'
              : `${selectedFieldIds.length} seleccionados`}
          </span>
          <div className={SELECTION_ACTIONS_CLASSES}>
            <MoveToStepMenu
              onSelect={(target) => moveFieldsToStep(selectedFieldIds, target)}
              triggerClassName={SELECTION_ACTION_CLASSES}
            />
            <button
              type="button"
              onClick={() => removeFields(selectedFieldIds)}
              aria-label="Eliminar los campos seleccionados"
              className={SELECTION_DANGER_CLASSES}
            >
              <Trash6 size={16} />
            </button>
            <button
              type="button"
              onClick={() => selectField(null)}
              aria-label="Deseleccionar"
              className={SELECTION_CLOSE_CLASSES}
            >
              <Xmark size={14} weight="Filled" />
            </button>
          </div>
        </div>
      )}

      <nav aria-label="Acciones del lienzo" className={BAR_CLASSES}>
        <button
          type="button"
          onClick={() => setSheet('add')}
          className={`${ITEM_CLASSES} ${CANVAS_TOOL_BUTTON_INACTIVE_CLASSES}`}
        >
          <Plus size={18} />
          Agregar
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className={`${ITEM_CLASSES} ${CANVAS_TOOL_BUTTON_INACTIVE_CLASSES}`}
        >
          <Undo size={18} />
          Deshacer
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className={`${ITEM_CLASSES} ${CANVAS_TOOL_BUTTON_INACTIVE_CLASSES}`}
        >
          <Redo size={18} />
          Rehacer
        </button>
        <button
          type="button"
          onClick={() => setSheet('view')}
          className={`${ITEM_CLASSES} ${CANVAS_TOOL_BUTTON_INACTIVE_CLASSES}`}
        >
          <Grid size={18} />
          Vista
        </button>
        <button
          type="button"
          onClick={() => setCanvasTool(isSelecting ? 'move' : 'select')}
          aria-pressed={isSelecting}
          className={`${ITEM_CLASSES} ${
            isSelecting ? CANVAS_TOOL_BUTTON_ACTIVE_CLASSES : CANVAS_TOOL_BUTTON_INACTIVE_CLASSES
          }`}
        >
          <VectorSquare size={18} />
          Seleccionar
        </button>
      </nav>

      {sheet === 'add' && (
        <BottomSheet title="Agregar" size="full" onClose={() => setSheet(null)}>
          <div className={STRUCTURE_GRID_CLASSES}>
            <button
              type="button"
              onClick={() => {
                if (viewMode !== 'canvas') setViewMode('canvas')
                addRowToActiveCanvas()
                setSheet(null)
                revealLastRow()
              }}
              className={STRUCTURE_BUTTON_CLASSES}
            >
              <Plus size={16} />
              Fila
            </button>
            <button
              type="button"
              disabled={isIntro}
              onClick={() => {
                if (viewMode !== 'canvas') setViewMode('canvas')
                addGroupToActiveStep()
                setSheet(null)
                revealLastGroup()
              }}
              className={STRUCTURE_BUTTON_CLASSES}
            >
              <Layers size={16} />
              Grupo repetible
            </button>
          </div>
          <FieldPalette
            onAfterAdd={() => {
              setSheet(null)
              revealAddedField()
            }}
          />
        </BottomSheet>
      )}

      {sheet === 'view' && (
        <BottomSheet title="Vista" size="peek" onClose={() => setSheet(null)}>
          <ViewModeSwitch
            activeMode={viewMode}
            onSelect={(mode) => {
              setViewMode(mode)
              setSheet(null)
            }}
          />
        </BottomSheet>
      )}
    </>
  )
}
