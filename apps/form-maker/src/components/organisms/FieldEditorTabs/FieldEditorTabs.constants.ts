import type { ContextMenuTab, TabButtonGroupItem } from '../../../types'

export const FIELD_EDITOR_TABS: TabButtonGroupItem<ContextMenuTab>[] = [
  { tab: 'attributes', label: 'Atributos' },
  { tab: 'styles', label: 'Estilos' },
  { tab: 'validations', label: 'Validaciones' },
  { tab: 'logic', label: 'Lógica' },
  { tab: 'apiMapping', label: 'Mapeo API' },
]
