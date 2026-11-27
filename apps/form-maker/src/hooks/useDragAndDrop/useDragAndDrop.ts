import type { DragEndEvent, DragMoveEvent, DragStartEvent, Modifier } from '@dnd-kit/core'
import { TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GRID_BASE_COLUMNS } from '../../constants'
import { useLayoutMode } from '../useLayoutMode'
import { getBandElement, getRowElement } from '../../lib'
import { findNearestFit, getFreeRuns } from '../../lib'
import { resolveBandDrop, resolveRowDrop } from '../../lib'
import { findRowById, getActiveRows, useFormStore } from '../../store'
import type { ActiveDrag, DragSource } from '../../types'
import type { DragAndDropReturn } from '../../types'
import type { CanvasField } from '../../types'
import type { FieldTypeDef } from '../../types'
import type { CanvasRow } from '../../types'
import type { CanvasTarget, DragPlacement, RowDropTarget } from '../../types'
import { POINTER_SENSOR_OPTIONS, TOUCH_SENSOR_OPTIONS } from './useDragAndDrop.constants'
import type { PointerPosition } from './useDragAndDrop.types'
import {
  centerOverlayOnCursor,
  getColumnAtPointer,
  getDropEdgeAtPointer,
  measureRow,
  MousePenSensor,
  pointerFirstCollision,
  sameCanvasTarget,
  samePlacement,
  sameRowDropTarget,
} from './useDragAndDrop.utils'

const OVERLAY_MODIFIERS: Modifier[] = [centerOverlayOnCursor]
// La fila no se centra: conserva el punto por donde se agarro.
const ROW_OVERLAY_MODIFIERS: Modifier[] = []

// Todo el arrastrar y soltar: de la paleta a una fila, entre filas y filas enteras. Shift resalta
// las columnas para elegir el inicio; Shift+Ctrl ancla el inicio y el puntero define el final. Los
// modificadores se leen en vivo.
export function useDragAndDrop(): DragAndDropReturn {
  const addFieldToRow = useFormStore((state) => state.addFieldToRow)
  const moveField = useFormStore((state) => state.moveField)
  const moveRow = useFormStore((state) => state.moveRow)
  const moveFieldsToStep = useFormStore((state) => state.moveFieldsToStep)
  const moveRowToStep = useFormStore((state) => state.moveRowToStep)
  const setDragPlacement = useFormStore((state) => state.setDragPlacement)
  const setRowDropTarget = useFormStore((state) => state.setRowDropTarget)
  const setRowDrag = useFormStore((state) => state.setRowDrag)
  const setDraggingFieldId = useFormStore((state) => state.setDraggingFieldId)
  const setHoveredTransferTarget = useFormStore((state) => state.setHoveredTransferTarget)
  const hoveredTransferTarget = useFormStore((state) => state.hoveredTransferTarget)
  const isLowPerformance = useFormStore((state) => state.isLowPerformance)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  // Sobrevive al soltar: dnd-kit lee dropAnimation en los renders de despues, con activeDrag ya en
  // null (auditoria B9).
  const [lastDragSource, setLastDragSource] = useState<DragSource | null>(null)

  // En refs y no en estado: cambia en cada movimiento y en cada tecla.
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const hoveredRowIdRef = useRef<string | null>(null)
  const hoveredBandIdRef = useRef<string | null>(null)
  const pointerRef = useRef<PointerPosition>({ x: 0, y: 0 })
  const modifiersRef = useRef({ shift: false, ctrl: false })
  const anchorRef = useRef<number | null>(null)

  const isPhone: boolean = useLayoutMode() === 'phone'
  const mouseSensor = useSensor(MousePenSensor, POINTER_SENSOR_OPTIONS)
  const touchSensor = useSensor(TouchSensor, TOUCH_SENSOR_OPTIONS)
  const sensors = useSensors(...(isPhone ? [] : [mouseSensor, touchSensor]))

  const getDraggedSpan = useCallback((drag: ActiveDrag | null): number => {
    if (!drag) return GRID_BASE_COLUMNS
    if (drag.source === 'canvas-field') return drag.field.colSpan
    return GRID_BASE_COLUMNS
  }, [])

  // Corre unas cien veces por segundo: solo se escribe al store cuando el valor cambia.
  const applyPlacement = useCallback(
    (next: DragPlacement | null): void => {
      if (samePlacement(useFormStore.getState().dragPlacement, next)) return
      setDragPlacement(next)
    },
    [setDragPlacement],
  )

  const recomputePlacement = useCallback((): void => {
    const drag = activeDragRef.current
    const rowId = hoveredRowIdRef.current
    const { shift, ctrl } = modifiersRef.current

    if (!drag || !rowId || !shift) {
      applyPlacement(null)
      return
    }

    const row = findRowById(useFormStore.getState(), rowId)
    const rowElement = getRowElement(rowId)
    if (!row || !rowElement) {
      applyPlacement(null)
      return
    }

    const column = getColumnAtPointer(rowElement, row.columns, pointerRef.current.x)
    const excludeId = drag.source === 'canvas-field' ? drag.field.id : undefined
    const runs = getFreeRuns(row.fields, row.columns, excludeId)

    if (ctrl) {
      if (anchorRef.current === null) anchorRef.current = column
      const anchor = anchorRef.current
      const run = runs.find((r) => anchor >= r.start && anchor < r.start + r.length)

      if (!run) {
        applyPlacement({ rowId, colStart: anchor, colSpan: 1, mode: 'resize', isValid: false })
        return
      }

      const maxSpan = run.start + run.length - anchor
      const colSpan = Math.max(1, Math.min(column - anchor + 1, maxSpan))
      applyPlacement({ rowId, colStart: anchor, colSpan, mode: 'resize', isValid: true })
      return
    }

    anchorRef.current = null
    const colSpan = Math.max(1, Math.min(getDraggedSpan(drag), row.columns))
    const snapped = findNearestFit(runs, column, colSpan)

    applyPlacement({
      rowId,
      colStart: snapped ?? column,
      colSpan,
      mode: 'move',
      isValid: snapped !== null,
    })
  }, [getDraggedSpan, applyPlacement])

  const applyRowDropTarget = useCallback(
    (next: RowDropTarget | null): void => {
      if (sameRowDropTarget(useFormStore.getState().rowDropTarget, next)) return
      setRowDropTarget(next)
    },
    [setRowDropTarget],
  )

  const recomputeRowDrop = useCallback(
    (draggedRow: CanvasRow): void => {
      const rows: CanvasRow[] = getActiveRows(useFormStore.getState())
      const hoveredRowId: string | null = hoveredRowIdRef.current
      const hoveredBandId: string | null = hoveredBandIdRef.current
      const pointerY: number = pointerRef.current.y

      // La fila primero: la banda solo gana en su cabecera y su relleno.
      if (hoveredRowId) {
        const element: HTMLElement | null = getRowElement(hoveredRowId)
        const edge = element ? getDropEdgeAtPointer(element, pointerY) : null

        applyRowDropTarget(edge && resolveRowDrop(rows, draggedRow.id, hoveredRowId, edge))
        return
      }

      if (hoveredBandId) {
        const element: HTMLElement | null = getBandElement(hoveredBandId)
        const edge = element ? getDropEdgeAtPointer(element, pointerY) : null

        applyRowDropTarget(edge && resolveBandDrop(rows, draggedRow.id, hoveredBandId, edge))
        return
      }

      applyRowDropTarget(null)
    },
    [applyRowDropTarget],
  )

  const recompute = useCallback((): void => {
    const drag = activeDragRef.current

    // Arrastrar una fila no coloca nada: sin este corte, Shift calcularia una colocacion fantasma.
    if (drag?.source === 'canvas-row') {
      applyPlacement(null)
      recomputeRowDrop(drag.row)
      return
    }

    applyRowDropTarget(null)
    recomputePlacement()
  }, [applyPlacement, applyRowDropTarget, recomputePlacement, recomputeRowDrop])

  useEffect(() => {
    if (!activeDrag) return

    function handlePointerMove(event: PointerEvent): void {
      pointerRef.current = { x: event.clientX, y: event.clientY }
      modifiersRef.current = { shift: event.shiftKey, ctrl: event.ctrlKey || event.metaKey }
      if (!modifiersRef.current.ctrl) anchorRef.current = null
      recompute()
    }

    function handleKeyChange(event: KeyboardEvent): void {
      const ctrl = event.ctrlKey || event.metaKey
      if (!ctrl) anchorRef.current = null
      modifiersRef.current = { shift: event.shiftKey, ctrl }
      recompute()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('keydown', handleKeyChange)
    window.addEventListener('keyup', handleKeyChange)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('keydown', handleKeyChange)
      window.removeEventListener('keyup', handleKeyChange)
    }
  }, [activeDrag, recompute])

  function resetDragState(): void {
    setActiveDrag(null)
    activeDragRef.current = null
    hoveredRowIdRef.current = null
    hoveredBandIdRef.current = null
    anchorRef.current = null
    modifiersRef.current = { shift: false, ctrl: false }
    setDragPlacement(null)
    setRowDropTarget(null)
    setRowDrag(null)
    setDraggingFieldId(null)
    setHoveredTransferTarget(null)
  }

  function handleDragStart(event: DragStartEvent): void {
    const data = event.active.data.current
    let drag: ActiveDrag | null = null

    if (data?.source === 'palette') {
      drag = { source: 'palette', fieldType: data.fieldType as FieldTypeDef }
    } else if (data?.source === 'canvas-field') {
      drag = { source: 'canvas-field', field: data.field as CanvasField }
    } else if (data?.source === 'canvas-row') {
      drag = { source: 'canvas-row', row: data.row as CanvasRow }
    }

    setActiveDrag(drag)
    setLastDragSource(drag?.source ?? null)
    activeDragRef.current = drag
    anchorRef.current = null
    // Al store porque lo leen la banda, la grilla y la previsualizacion; son dos escrituras por
    // arrastre.
    setRowDrag(drag?.source === 'canvas-row' ? measureRow(drag.row.id) : null)
    // Lo leen las pestanas de paso para encenderse como destino de mudanza, igual que rowDrag.
    setDraggingFieldId(drag?.source === 'canvas-field' ? drag.field.id : null)
  }

  function handleDragMove(event: DragMoveEvent): void {
    const overData = event.over?.data.current as
      { rowId?: string; bandGroupId?: string; canvasTarget?: CanvasTarget } | undefined
    hoveredRowIdRef.current = overData?.rowId ?? null
    hoveredBandIdRef.current = overData?.bandGroupId ?? null

    // Al store solo cuando cambia: corre en cada movimiento.
    const nextTarget: CanvasTarget | null = overData?.canvasTarget ?? null
    if (!sameCanvasTarget(useFormStore.getState().hoveredTransferTarget, nextTarget)) {
      setHoveredTransferTarget(nextTarget)
    }

    recompute()
  }

  function handleDragEnd(event: DragEndEvent): void {
    const placement = useFormStore.getState().dragPlacement
    const rowDropTarget = useFormStore.getState().rowDropTarget
    const requested = placement?.isValid
      ? { colStart: placement.colStart, colSpan: placement.colSpan }
      : undefined

    const { active, over } = event
    const data = active.data.current
    resetDragState()

    const overData = over?.data.current as
      { rowId?: string; canvasTarget?: CanvasTarget } | undefined

    // Soltar sobre una pestana va primero: el destino es otro lienzo.
    if (overData?.canvasTarget) {
      if (data?.source === 'canvas-field') {
        moveFieldsToStep([(data.field as CanvasField).id], overData.canvasTarget)
      } else if (data?.source === 'canvas-row') {
        moveRowToStep((data.row as CanvasRow).id, overData.canvasTarget)
      }
      return
    }

    // Por el destino resuelto y no por over: el iman pudo llevarla al borde de una banda.
    if (data?.source === 'canvas-row') {
      if (rowDropTarget?.isValid) moveRow((data.row as CanvasRow).id, rowDropTarget)
      return
    }

    if (!over) return

    const targetRowId = overData?.rowId
    if (!targetRowId) return

    if (data?.source === 'palette') {
      addFieldToRow(targetRowId, data.fieldType as FieldTypeDef, requested)
    } else if (data?.source === 'canvas-field') {
      const field = data.field as CanvasField
      moveField(field.id, targetRowId, requested)
    }
  }

  // dnd-kit cancela con Escape, pointercancel, cambio de pestana o resize, y entonces llama solo a
  // onDragCancel: sin esto quedaban vivos el estado del arrastre y los listeners de arriba.
  function handleDragCancel(): void {
    resetDragState()
  }

  return {
    sensors,
    activeDrag,
    collisionDetection: pointerFirstCollision,
    // Sobre una pestana, y siempre en bajo rendimiento, la ficha va centrada en el cursor.
    overlayModifiers:
      activeDrag?.source === 'canvas-row' && !hoveredTransferTarget && !isLowPerformance
        ? ROW_OVERLAY_MODIFIERS
        : OVERLAY_MODIFIERS,
    // Una fila no anima al soltarla ni al cancelarla: la copia necesita rowDrag, que ya se borro, y
    // se volvia la ficha chica flotando 300 ms. undefined es la animacion de dnd-kit.
    dropAnimation: lastDragSource === 'canvas-row' ? null : undefined,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  }
}
