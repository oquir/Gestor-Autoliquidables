import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef } from 'react'
import type { UseModalKeyGuardResult } from './useModalKeyGuard.types'

// Aisla el teclado de un modal abierto con el campo seleccionado detras: Escape, Suprimir y Ctrl+A
// lo afectarian. No frena todo en captura para no quitarle el teclado a CodeMirror: lo de adentro
// se frena al salir del dialogo; lo de afuera, en captura.

// Ctrl+S pasa siempre: frenarlo no anula el atajo, se lo deja al "Guardar como" del navegador.
function isSaveShortcut(event: KeyboardEvent | ReactKeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
}

// isCovered: la capa quedo tapada por otra (una hoja abierta desde esta). Entonces no frena ni
// cierra nada: si frenara en captura, el Escape no llegaria nunca a la de arriba y cerraria esta.
export function useModalKeyGuard(
  onClose: () => void,
  isCovered?: () => boolean,
): UseModalKeyGuardResult {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isSaveShortcut(event)) return
      if (isCovered?.()) return
      if (event.target instanceof Node && dialogRef.current?.contains(event.target)) return

      event.stopPropagation()
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose, isCovered])

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (isSaveShortcut(event)) return

    event.stopPropagation()
    // Un Escape que CodeMirror ya uso (cerrar el autocompletado, colapsar una seleccion) no cierra.
    if (event.key === 'Escape' && !event.defaultPrevented) onClose()
  }

  return { dialogRef, handleDialogKeyDown }
}
