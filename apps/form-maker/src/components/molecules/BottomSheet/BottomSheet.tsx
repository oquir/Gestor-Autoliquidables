import { type FocusEvent, useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Xmark } from 'reicon-react'
import { useBackClose, useInertOutside, useModalKeyGuard } from '../../../hooks'
import { revealScrollBehavior } from '../../../lib'
import { useFormStore } from '../../../store'
import { IconButton } from '../../atoms'
import {
  BACKDROP_CLASSES,
  BODY_CLASSES,
  CLOSE_BUTTON_CLASSES,
  DESCRIPTION_CLASSES,
  FOOTER_CLASSES,
  HEADER_CLASSES,
  LAYER_CLASSES,
  PANEL_CLASSES,
  SIZE_CLASSES,
  TITLE_CLASSES,
} from './BottomSheet.constants'
import type { BottomSheetProps } from './BottomSheet.types'

export function BottomSheet({
  title,
  description,
  children,
  footer,
  onClose,
  size = 'half',
}: BottomSheetProps) {
  const titleId: string = useId()
  const layerRef = useRef<HTMLDivElement | null>(null)
  // Una hoja abierta desde esta la deja inerte (useInertOutside): ahi el teclado es de la otra.
  const isCovered = useCallback((): boolean => layerRef.current?.inert === true, [])
  const { dialogRef, handleDialogKeyDown } = useModalKeyGuard(onClose, isCovered)
  useInertOutside(layerRef, dialogRef)
  useBackClose(true, onClose)

  // Con el teclado abierto la pantalla en dvh se achica: mantiene visible el campo enfocado.
  useEffect(() => {
    const viewport: VisualViewport | null = window.visualViewport
    if (!viewport) return

    function keepFocusedVisible(): void {
      const active = document.activeElement
      if (
        active instanceof HTMLElement &&
        dialogRef.current?.contains(active) &&
        active.matches('input, textarea, select')
      ) {
        active.scrollIntoView({
          block: 'nearest',
          behavior: revealScrollBehavior(useFormStore.getState().isLowPerformance),
        })
      }
    }

    viewport.addEventListener('resize', keepFocusedVisible)
    return () => viewport.removeEventListener('resize', keepFocusedVisible)
  }, [dialogRef])

  function handleBodyFocusCapture(event: FocusEvent<HTMLDivElement>): void {
    const target = event.target
    if (!(target instanceof HTMLElement) || !target.matches('input, textarea, select')) return

    window.setTimeout(() => {
      target.scrollIntoView({
        block: 'nearest',
        behavior: revealScrollBehavior(useFormStore.getState().isLowPerformance),
      })
    }, 150)
  }

  return createPortal(
    <div ref={layerRef} className={LAYER_CLASSES}>
      <div aria-hidden className={BACKDROP_CLASSES} onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className={`${PANEL_CLASSES} ${SIZE_CLASSES[size]}`}
      >
        <header className={HEADER_CLASSES}>
          <div className="min-w-0">
            <h2 id={titleId} className={TITLE_CLASSES}>
              {title}
            </h2>
            {description && <p className={DESCRIPTION_CLASSES}>{description}</p>}
          </div>
          <IconButton onClick={onClose} title="Cerrar" className={CLOSE_BUTTON_CLASSES}>
            <Xmark size={16} />
          </IconButton>
        </header>

        <div onFocusCapture={handleBodyFocusCapture} className={BODY_CLASSES}>
          {children}
        </div>

        {footer && <footer className={FOOTER_CLASSES}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
