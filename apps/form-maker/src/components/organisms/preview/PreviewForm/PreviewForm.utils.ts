import type { KeyboardEvent } from 'react'
import { TOUCH_POINTER_QUERY } from '../../../../constants'
import { TEXT_ENTRY_SELECTOR } from './PreviewForm.constants'

// Los campos que abren teclado, en orden de DOM (el de colStart, como se ven). Lo de un dialogo
// (el buscador de search_select) queda afuera: tiene su propio Enter.
function textEntriesIn(scope: HTMLElement): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(TEXT_ENTRY_SELECTOR)].filter(
    (element) => element.closest('[role="dialog"]') === null,
  )
}

// La tecla de accion del teclado: "siguiente" en todos y "listo" en el ultimo. En el escritorio no
// hay teclado en pantalla y el atributo no hace nada.
export function labelEnterKeys(scope: HTMLElement | null): void {
  if (!scope) return
  const entries: HTMLElement[] = textEntriesIn(scope)
  entries.forEach((element, index) => {
    if (element instanceof HTMLTextAreaElement) return
    element.enterKeyHint = index === entries.length - 1 ? 'done' : 'next'
  })
}

// Fuera de un <form> el navegador no salta solo: Enter pasa al campo siguiente o, en el ultimo,
// cierra el teclado. Solo en tactil; con mouse Enter sigue sin hacer nada.
export function handleEnterKey(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
  if (!window.matchMedia(TOUCH_POINTER_QUERY).matches) return

  const target: EventTarget = event.target
  if (!(target instanceof HTMLInputElement)) return
  const entries: HTMLElement[] = textEntriesIn(event.currentTarget)
  const index: number = entries.indexOf(target)
  if (index === -1) return

  event.preventDefault()
  const next: HTMLElement | undefined = entries[index + 1]
  if (next) next.focus()
  else target.blur()
}
