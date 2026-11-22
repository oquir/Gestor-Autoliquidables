// El contenedor contra el que mide la miniatura (100cqw/100cqh en PDF_THUMBNAIL_FRAME_STYLE). Solo
// envuelve la miniatura: container-type crea un bloque contenedor y no puede rodear un ModalShell.
export const STAGE_CLASSES: string =
  'flex min-h-0 flex-1 flex-col items-center justify-center [container-type:size]'

export const ERROR_CLASSES: string =
  'flex items-center justify-center rounded-sm border border-dashed border-border-strong px-4 text-center text-xs text-fg-muted'
