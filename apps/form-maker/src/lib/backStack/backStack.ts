import type { BackEntryState, BackLayerClose, BackLayerPop } from '../../types'

// Pila del boton Atras de Android (pura; B8 de docs/Plan-Movil.md). Cada capa abierta (simulador,
// disenador de PDF, hoja, cajon, modal) agrega una entrada al historial con su piso: la capa N deja
// el piso N. Atras vuelve a la entrada de abajo, y popstate trae ese piso: se cierran las capas que
// quedaron por encima. Contar pisos y no toques de Atras se corrige solo: si una capa se cierra
// desde la interfaz (history.back) y otra se abre antes del popstate, el piso que llega sigue
// diciendo cuantas tienen entrada.

const DEPTH_KEY: keyof BackEntryState = 'formMakerBackDepth'

export function openBackLayer(stack: readonly string[], id: string): string[] {
  return stack.includes(id) ? [...stack] : [...stack, id]
}

export function closeBackLayer(stack: readonly string[], id: string): BackLayerClose {
  if (!stack.includes(id)) return { stack: [...stack], goBack: false }

  return { stack: stack.filter((layerId) => layerId !== id), goBack: true }
}

export function popBackLayers(stack: readonly string[], depth: number): BackLayerPop {
  const floor: number = Math.max(0, Math.min(depth, stack.length))

  return { stack: stack.slice(0, floor), closing: stack.slice(floor).reverse() }
}

export function backEntryState(depth: number): BackEntryState {
  return { [DEPTH_KEY]: depth }
}

// Una entrada que no es nuestra (la de carga, o una de otra app) es el piso 0.
export function readBackDepth(state: unknown): number {
  if (typeof state !== 'object' || state === null) return 0
  const depth: unknown = (state as Record<string, unknown>)[DEPTH_KEY]
  if (typeof depth !== 'number' || !Number.isFinite(depth) || depth < 0) return 0

  return Math.floor(depth)
}
