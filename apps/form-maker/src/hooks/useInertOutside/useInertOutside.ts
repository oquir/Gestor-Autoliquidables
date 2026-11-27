import { type RefObject, useEffect } from 'react'

// Capa modal que va en un portal del body (BottomSheet, mas adelante SideDrawer): deja inerte todo
// lo demas del body mientras esta montada, mueve el foco adentro y al cerrar lo devuelve a donde
// estaba. inert ya atrapa el foco (Tab no sale) y saca lo de atras del lector de pantalla.
// Solo marca lo que no estaba inerte y solo desmarca eso: una hoja abierta desde otra deja inerte a
// la primera y al cerrarse la devuelve tal cual. Lo que se agrega al body despues (los globos de
// Tooltip) queda vivo, que es lo que se quiere.
// focusRef: lo que recibe el foco (el dialogo); sin el, el contenedor.
export function useInertOutside(
  containerRef: RefObject<HTMLElement | null>,
  focusRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const container: HTMLElement | null = containerRef.current
    if (!container) return

    const previousFocus: Element | null = document.activeElement
    const marked: HTMLElement[] = []
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === container || child.inert) continue
      child.inert = true
      marked.push(child)
    }

    // Sin scroll: la hoja entra animada y el foco no debe mover la pagina de atras.
    const focusTarget: HTMLElement = focusRef?.current ?? container
    focusTarget.focus({ preventScroll: true })

    return () => {
      for (const element of marked) element.inert = false
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true })
      }
    }
  }, [containerRef, focusRef])
}
