// Cortes del modo de layout, en px de ancho de ventana. Los mismos que max-sm (640) y xl (1280) de
// Tailwind, para que las clases y el JS cambien juntos.
export const LAYOUT_PHONE_MAX_WIDTH: number = 640

export const LAYOUT_DESKTOP_MIN_WIDTH: number = 1280

// Las dos consultas que cambian de modo al cruzarlas (useLayoutMode las escucha con matchMedia).
export const LAYOUT_MEDIA_QUERIES: readonly string[] = [
  `(min-width: ${LAYOUT_PHONE_MAX_WIDTH}px)`,
  `(min-width: ${LAYOUT_DESKTOP_MIN_WIDTH}px)`,
]
