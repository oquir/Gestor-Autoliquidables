import { useSyncExternalStore } from 'react'
import { LAYOUT_MEDIA_QUERIES } from '../../constants'
import { layoutModeFor } from '../../lib'
import type { LayoutMode } from '../../types'

// Modo de layout de la ventana (phone, compact, desktop). Una sola escucha de matchMedia para toda
// la app, creada con el primer suscriptor y soltada con el ultimo: muchos menus montados no suman
// listeners, y repintar no crea ninguno (subscribe es de modulo).
// Escucha los dos cortes y no resize: solo avisa cuando el modo cambia.

const listeners: Set<() => void> = new Set()
let mediaLists: MediaQueryList[] = []

function notify(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    mediaLists = LAYOUT_MEDIA_QUERIES.map((query) => window.matchMedia(query))
    for (const list of mediaLists) list.addEventListener('change', notify)
  }
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
    if (listeners.size > 0) return
    for (const list of mediaLists) list.removeEventListener('change', notify)
    mediaLists = []
  }
}

function getSnapshot(): LayoutMode {
  return layoutModeFor(window.innerWidth)
}

export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribe, getSnapshot)
}
