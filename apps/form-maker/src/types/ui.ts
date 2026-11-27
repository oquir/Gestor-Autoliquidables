export type SidebarTab =
  | 'fields'
  | 'attributes'
  | 'validations'
  | 'styles'
  | 'logic'
  | 'apiMapping'
  | 'catalogs'
  | 'fechas'

export type RightSidebarTab = 'project' | 'steps'

export type CanvasViewMode = 'canvas' | 'review' | 'json' | 'payload'

// select y hand dejan el documento inerte: el puntero lo maneja el puerto.
export type CanvasTool = 'move' | 'select' | 'hand'

export interface CanvasToolItem {
  tool: CanvasTool
  label: string
  // Sin modificadores.
  shortcut: string
}

// Por el ancho de la ventana (docs/Plan-Movil.md, seccion 0): lista y hojas en phone, cajones en
// compact, lo de siempre en desktop. Estado de vista: nunca va al borrador ni al export.
export type LayoutMode = 'phone' | 'compact' | 'desktop'

// Alto de la hoja de abajo (BottomSheet): asoma (un vistazo), media (lo comun) o completa (editores
// largos).
export type BottomSheetSize = 'peek' | 'half' | 'full'
