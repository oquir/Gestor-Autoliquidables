import { TOOLTIP_ACTION_SELECTOR } from './Tooltip.constants'

// En tactil un toque que ejecuta una accion no abre ademas el globo. Mira el DOM real y no el
// hijo de React: muchos globos envuelven un span con un boton adentro (para el disabled) o van
// dentro de un boton (las insignias del chip).
export function isActionReference(element: Element): boolean {
  return (
    element.closest(TOOLTIP_ACTION_SELECTOR) !== null ||
    element.querySelector(TOOLTIP_ACTION_SELECTOR) !== null
  )
}
