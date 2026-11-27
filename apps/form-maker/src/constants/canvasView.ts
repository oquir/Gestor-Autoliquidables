import type { TabButtonGroupItem } from '../types'
import type { CanvasViewMode } from '../types'

export const VIEW_MODE_TABS: TabButtonGroupItem<CanvasViewMode>[] = [
  { tab: 'canvas', label: 'Lienzo' },
  { tab: 'json', label: 'JSON' },
  { tab: 'payload', label: 'Payload' },
]

export const PHONE_VIEW_MODE_TABS: TabButtonGroupItem<CanvasViewMode>[] = [
  { tab: 'canvas', label: 'Lista' },
  { tab: 'review', label: 'Revisar' },
  { tab: 'json', label: 'JSON' },
  { tab: 'payload', label: 'Payload' },
]
