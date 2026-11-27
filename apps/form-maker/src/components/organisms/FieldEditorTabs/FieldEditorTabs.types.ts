import type { CanvasField, ContextMenuTab } from '../../../types'

export interface FieldEditorTabsProps {
  field: CanvasField
  activeTab: ContextMenuTab
  onSelectTab: (tab: ContextMenuTab) => void
  bodyClassName?: string
}
