import { useEffect, useEffectEvent, useId } from 'react'
import { TOUCH_POINTER_QUERY } from '../../constants'
import {
  backEntryState,
  closeBackLayer,
  openBackLayer,
  popBackLayers,
  readBackDepth,
} from '../../lib'
import type { BackLayerClose, BackLayerPop } from '../../types'

// Boton Atras de Android (B8 de docs/Plan-Movil.md): mientras isOpen, la capa (simulador, disenador
// de PDF, hoja, cajon, modal) tiene una entrada en el historial y Atras la cierra en vez de sacar de
// FormMaker. La cuenta es de lib/backStack; aca solo el historial y el popstate.
// pushState sin URL: el disenador lee ?impuesto= y la direccion no cambia.
// Solo con puntero tactil: el plan deja el escritorio igual (Atras del mouse o Alt+← siguen
// saliendo de la pagina). Se decide al abrir la capa.
// Una sola pila y un solo listener para toda la app, a nivel de modulo: las capas no se conocen.

let stack: string[] = []
const closers: Map<string, () => void> = new Map()
let isListening: boolean = false

function handlePopState(event: PopStateEvent): void {
  const result: BackLayerPop = popBackLayers(stack, readBackDepth(event.state))
  stack = result.stack
  for (const id of result.closing) closers.get(id)?.()
}

export function useBackClose(isOpen: boolean, onClose: () => void): void {
  const id: string = useId()
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!isOpen || !window.matchMedia(TOUCH_POINTER_QUERY).matches) return

    if (!isListening) {
      window.addEventListener('popstate', handlePopState)
      isListening = true
    }
    closers.set(id, () => close())
    stack = openBackLayer(stack, id)
    window.history.pushState(backEntryState(stack.length), '')

    return () => {
      closers.delete(id)
      // Cerrada desde la interfaz (X, fondo, Escape): se gasta su entrada para que el proximo Atras
      // cierre la capa de abajo y no quede un toque muerto.
      const result: BackLayerClose = closeBackLayer(stack, id)
      stack = result.stack
      if (result.goBack) window.history.back()
    }
  }, [isOpen, id])
}
