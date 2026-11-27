import { useState } from 'react'
import { Grid, Plus, Redo, Undo, VectorSquare } from 'reicon-react'
import {
  CANVAS_TOOL_BUTTON_ACTIVE_CLASSES,
  CANVAS_TOOL_BUTTON_INACTIVE_CLASSES,
} from '../../../constants/uiClasses'
import { useFormHistory } from '../../../hooks/useFormHistory/useFormHistory'
import { useFormStore } from '../../../store/formStore'
import { BottomSheet } from '../../molecules/BottomSheet/BottomSheet'
import { ViewModeSwitch } from '../../molecules/ViewModeSwitch/ViewModeSwitch'
import { FieldPalette } from '../FieldPalette/FieldPalette'
import { BAR_CLASSES, ITEM_CLASSES } from './PhoneBottomBar.constants'
import type { PhoneBottomSheet } from './PhoneBottomBar.types'

export function PhoneBottomBar() {
  const canvasTool = useFormStore((state) => state.canvasTool)
  const setCanvasTool = useFormStore((state) => state.setCanvasTool)
  const viewMode = useFormStore((state) => state.canvasViewMode)
  const setViewMode = useFormStore((state) => state.setCanvasViewMode)
  const { canUndo, canRedo, undo, redo } = useFormHistory()
  const [sheet, setSheet] = useState<PhoneBottomSheet | null>(null)
  const isSelecting: boolean = canvasTool === 'select'

  return (
    <>
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
        <BottomSheet title="Agregar campo" size="full" onClose={() => setSheet(null)}>
          <FieldPalette />
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
