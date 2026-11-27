import { type MouseEvent, type PointerEvent, useCallback, useRef, useState } from 'react'
import { useCanvasViewport, useLayoutMode, useViewModeScroll } from '../../../hooks'
import { findFieldById, getActiveGroups, getActiveRows, useFormStore } from '../../../store'
import type { CanvasField, FieldContextMenuState } from '../../../types'
import { CanvasList } from '../CanvasList'
import { CanvasRowsGrid } from '../CanvasRowsGrid'
import { CanvasToolLayer } from '../CanvasToolLayer'
import { FieldContextMenu } from '../FieldContextMenu'
import { FieldEditorSheet } from '../FieldEditorSheet'
import { JsonPreviewCanvas } from '../JsonPreviewCanvas'
import { PayloadPreviewCanvas } from '../PayloadPreviewCanvas'
import { TOOL_ROOT_CLASSES } from './Canvas.constants'
import { ENTER_FADE_CLASSES } from '../../../constants'

export function Canvas() {
  const activeRows = useFormStore(getActiveRows)
  const activeGroups = useFormStore(getActiveGroups)
  const activeCanvas = useFormStore((state) => state.activeCanvas)
  const viewMode = useFormStore((state) => state.canvasViewMode)
  const canvasTool = useFormStore((state) => state.canvasTool)
  const selectField = useFormStore((state) => state.selectField)
  const [contextMenu, setContextMenu] = useState<FieldContextMenuState | null>(null)
  const [reviewFieldId, setReviewFieldId] = useState<string | null>(null)
  const reviewPressTimerRef = useRef<number | null>(null)
  const reviewPressStartRef = useRef<{ x: number; y: number } | null>(null)
  const reviewLongPressedRef = useRef<boolean>(false)
  const { contentRef, rootStyle, contentStyle } = useCanvasViewport()
  const isPhone: boolean = useLayoutMode() === 'phone'
  const isReview: boolean = isPhone && viewMode === 'review'
  useViewModeScroll(viewMode)

  const isIntro = activeCanvas.type === 'introStep'
  const reviewField: CanvasField | null =
    isReview && reviewFieldId ? findFieldById(activeRows, reviewFieldId) : null

  function clearReviewPress(): void {
    if (reviewPressTimerRef.current !== null) {
      window.clearTimeout(reviewPressTimerRef.current)
      reviewPressTimerRef.current = null
    }
    reviewPressStartRef.current = null
  }

  function handleReviewPointerDownCapture(event: PointerEvent<HTMLDivElement>): void {
    event.stopPropagation()
    clearReviewPress()
    reviewLongPressedRef.current = false
    if (event.button !== 0 && event.pointerType === 'mouse') return

    const target = event.target
    if (!(target instanceof Element)) return
    const fieldElement: HTMLElement | null = target.closest<HTMLElement>('[data-field-id]')
    const fieldId: string | undefined = fieldElement?.dataset.fieldId
    if (!fieldId) return

    reviewPressStartRef.current = { x: event.clientX, y: event.clientY }
    reviewPressTimerRef.current = window.setTimeout(() => {
      reviewLongPressedRef.current = true
      reviewPressTimerRef.current = null
      reviewPressStartRef.current = null
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(15)
      }
      selectField(fieldId)
      setReviewFieldId(fieldId)
    }, 450)
  }

  function handleReviewPointerMoveCapture(event: PointerEvent<HTMLDivElement>): void {
    const start = reviewPressStartRef.current
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) clearReviewPress()
  }

  function handleReviewClickCapture(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation()
    event.preventDefault()

    if (reviewLongPressedRef.current) {
      reviewLongPressedRef.current = false
      return
    }

    const target = event.target
    if (!(target instanceof Element)) return
    const fieldElement: HTMLElement | null = target.closest<HTMLElement>('[data-field-id]')
    const fieldId: string | undefined = fieldElement?.dataset.fieldId
    if (!fieldId) return

    selectField(fieldId)
  }

  // Clic en vacio suelta la seleccion. Busca hacia arriba un campo, fila o grupo: comparar contra
  // un contenedor fallaba con envoltorios decorativos. Solo en Mover.
  function handleCanvasPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (canvasTool !== 'move') return

    const target = event.target
    const hitsSelectable: boolean =
      target instanceof Element &&
      target.closest('[data-field-id], [data-canvas-row], [data-band-id]') !== null

    if (!hitsSelectable) selectField(null)
  }

  // Estable: llega a cada fila, y una funcion nueva por render anularia su memo.
  const openContextMenu: (fieldId: string, x: number, y: number) => void = useCallback(
    (fieldId: string, x: number, y: number): void => setContextMenu({ fieldId, x, y }),
    [],
  )

  if (viewMode === 'json' || viewMode === 'payload') {
    return (
      <div key={viewMode} className={`mx-auto max-w-5xl px-6 py-8 ${ENTER_FADE_CLASSES}`}>
        {viewMode === 'json' && <JsonPreviewCanvas />}
        {viewMode === 'payload' && <PayloadPreviewCanvas />}
      </div>
    )
  }

  if (isPhone && viewMode === 'canvas') return <CanvasList />

  return (
    <div
      style={rootStyle}
      className={TOOL_ROOT_CLASSES[canvasTool]}
      onPointerDown={handleCanvasPointerDown}
    >
      {/* Con la mano o el marco el documento queda inerte (sin dnd-kit, resize ni menu). La
          paleta sigue soltando: dnd-kit choca por rects, no por eventos. */}
      <div
        ref={contentRef}
        style={contentStyle}
        data-review-preview={isReview ? '' : undefined}
        onPointerDownCapture={isReview ? handleReviewPointerDownCapture : undefined}
        onPointerMoveCapture={isReview ? handleReviewPointerMoveCapture : undefined}
        onPointerUpCapture={isReview ? clearReviewPress : undefined}
        onPointerCancelCapture={isReview ? clearReviewPress : undefined}
        onContextMenuCapture={isReview ? (event) => event.preventDefault() : undefined}
        onClickCapture={isReview ? handleReviewClickCapture : undefined}
        className={`mx-auto ${ENTER_FADE_CLASSES} ${canvasTool === 'move' || isReview ? '' : 'pointer-events-none'} ${isReview ? 'select-none' : ''}`}
      >
        {isIntro ? (
          <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-slate-100 p-6 dark:bg-neutral-950">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-5 select-none rounded-lg border-2 border-dashed border-slate-200 bg-white p-4 opacity-50 blur-[1.5px] low-performance:filter-none dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex flex-col gap-3">
                <div className="h-9 w-1/3 rounded bg-slate-200 dark:bg-neutral-800" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-9 rounded bg-slate-200 dark:bg-neutral-800" />
                  <div className="h-9 rounded bg-slate-200 dark:bg-neutral-800" />
                </div>
                <div className="h-9 w-full rounded bg-slate-200 dark:bg-neutral-800" />
                <div className="h-9 w-3/4 rounded bg-slate-200 dark:bg-neutral-800" />
              </div>
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-slate-900/10 dark:bg-black/40"
            />
            <div className="relative z-10 flex min-h-110 w-full max-w-140 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-neutral-800">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                  Modal de entrada
                </span>
              </div>
              <CanvasRowsGrid rows={activeRows} onFieldContextMenu={openContextMenu} />
            </div>
          </div>
        ) : (
          <div className="min-h-[60vh] rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <CanvasRowsGrid
              rows={activeRows}
              groups={activeGroups}
              onFieldContextMenu={openContextMenu}
            />
          </div>
        )}
      </div>

      {!isReview && <CanvasToolLayer />}
      {!isReview && contextMenu && (
        <FieldContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      )}
      {reviewField && (
        <FieldEditorSheet field={reviewField} onClose={() => setReviewFieldId(null)} />
      )}
    </div>
  )
}
