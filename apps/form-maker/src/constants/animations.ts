// Animaciones de entrada (tw-animate-css). Reglas en docs/Decisiones.md, "Low-performance mode"; el
// modo de bajo rendimiento las apaga con la regla global de index.css.

// TRAMPA: en filas y bandas nada de duration-*, delay-* ni ease-*: tambien tocan sus transiciones
// propias (borde, desplazamiento). Ahi van animation-duration-* y --tw-animation-delay.

export const ENTER_FADE_CLASSES: string =
  'animate-in fade-in animation-duration-160 ease-out motion-reduce:animate-none'

export const ENTER_MODAL_CLASSES: string =
  'animate-in fade-in zoom-in-96 slide-in-from-bottom-2 animation-duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none'

export const ENTER_POP_CLASSES: string =
  'animate-in fade-in zoom-in-95 animation-duration-140 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none'

export const ENTER_RISE_CLASSES: string =
  'animate-in fade-in slide-in-from-bottom-[6px] animation-duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none'

// Escalonada por --enter-index (tope 12); backwards la esconde durante su retardo.
export const ENTER_ROW_CLASSES: string =
  'animate-in fade-in slide-in-from-bottom-[10px] animation-duration-260 fill-mode-backwards [--tw-animation-delay:calc(min(var(--enter-index,0),12)*35ms)] motion-reduce:animate-none'

export const ENTER_FIELD_CLASSES: string =
  'animate-in fade-in zoom-in-90 animation-duration-240 ease-[cubic-bezier(0.34,1.4,0.5,1)] motion-reduce:animate-none'

export const ENTER_STEP_FORWARD_CLASSES: string =
  'animate-in fade-in slide-in-from-right-4 animation-duration-240 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none'

export const ENTER_STEP_BACK_CLASSES: string =
  'animate-in fade-in slide-in-from-left-4 animation-duration-240 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none'

export const ENTER_CHECK_CLASSES: string =
  'animate-in fade-in zoom-in-40 animation-duration-260 ease-[cubic-bezier(0.34,1.4,0.5,1)] motion-reduce:animate-none'

// La hoja de abajo (BottomSheet) sube desde fuera de la pantalla. Sin fill-mode: al terminar no
// queda transform, que volveria a la hoja bloque contenedor de un ModalShell abierto desde adentro.
export const ENTER_SHEET_CLASSES: string =
  'animate-in slide-in-from-bottom animation-duration-240 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none'

// El cajon lateral (SideDrawer) entra desde su borde. Sin fill-mode, por lo mismo que la hoja: los
// paneles que lleva abren ModalShell desde adentro.
export const ENTER_DRAWER_LEFT_CLASSES: string =
  'animate-in slide-in-from-left animation-duration-240 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none'

export const ENTER_DRAWER_RIGHT_CLASSES: string =
  'animate-in slide-in-from-right animation-duration-240 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:animate-none'
