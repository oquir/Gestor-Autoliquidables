import { fieldKey } from '../../lib/runtimeValidation/runtimeValidation.utils'
import type { PreviewState, RuntimeModel, RuntimeValues } from '../../types'

// Quitar una repeticion sube un lugar las de abajo: sus errores revelados suben con ellas y los de
// la quitada se van. Sin esto, la que queda en el lugar de otra hereda sus errores en rojo. Las
// claves de grupo son grupo:indice:campo (fieldKey).
export function removeRevealedItem(
  revealed: Record<string, boolean>,
  groupId: string,
  index: number,
): Record<string, boolean> {
  const prefix: string = `${groupId}:`
  const next: Record<string, boolean> = {}
  let changed: boolean = false

  for (const [key, value] of Object.entries(revealed)) {
    const match: RegExpExecArray | null = key.startsWith(prefix)
      ? /^(\d+):(.+)$/.exec(key.slice(prefix.length))
      : null
    const position: number = match ? Number(match[1]) : -1

    if (!match || position < index) {
      next[key] = value
      continue
    }

    changed = true
    if (position > index) next[fieldKey(match[2], groupId, position - 1)] = value
  }

  return changed ? next : revealed
}

export function emptyGroupItem(model: RuntimeModel, groupId: string): RuntimeValues {
  const item: RuntimeValues = {}

  for (const field of model.groupFields.get(groupId) ?? []) item[field.name] = undefined

  return item
}

// El modelo se rehace en cada edicion: acomoda grupos nuevos o borrados sin perder lo escrito.
export function reconcileState(model: RuntimeModel, state: PreviewState): PreviewState {
  const groups: Record<string, RuntimeValues[]> = {}
  let changed = false

  for (const [groupId] of model.groupFields) {
    const min: number = Math.max(1, model.groupsById.get(groupId)?.min ?? 1)
    const current: RuntimeValues[] = state.groups[groupId] ?? []
    const filled: RuntimeValues[] = [...current]

    while (filled.length < min) filled.push(emptyGroupItem(model, groupId))

    if (filled.length !== current.length) changed = true
    groups[groupId] = filled
  }

  if (Object.keys(groups).length !== Object.keys(state.groups).length) changed = true

  // El mismo objeto si nada cambio: si no, el efecto entraria en bucle.
  return changed ? { ...state, groups } : state
}
