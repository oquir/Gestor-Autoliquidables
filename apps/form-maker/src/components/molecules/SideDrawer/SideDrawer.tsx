import { useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useInertOutside, useModalKeyGuard } from '../../../hooks'
import {
  BACKDROP_CLASSES,
  LAYER_CLASSES,
  PANEL_CLASSES,
  SIDE_CLASSES,
} from './SideDrawer.constants'
import type { SideDrawerProps } from './SideDrawer.types'

export function SideDrawer({ label, children, onClose, side = 'left' }: SideDrawerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null)
  // Una hoja abierta desde el cajon lo deja inerte (useInertOutside): ahi el teclado es de la hoja.
  const isCovered = useCallback((): boolean => layerRef.current?.inert === true, [])
  const { dialogRef, handleDialogKeyDown } = useModalKeyGuard(onClose, isCovered)
  useInertOutside(layerRef, dialogRef)

  return createPortal(
    <div ref={layerRef} className={LAYER_CLASSES}>
      <div aria-hidden className={BACKDROP_CLASSES} onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className={`${PANEL_CLASSES} ${SIDE_CLASSES[side]}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
