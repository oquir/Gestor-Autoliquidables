import { CANVAS_TOOLS } from '../../../constants/canvasTool'
import {
  CANVAS_TOOL_BUTTON_ACTIVE_CLASSES,
  CANVAS_TOOL_BUTTON_BASE_CLASSES,
  CANVAS_TOOL_BUTTON_INACTIVE_CLASSES,
  CANVAS_TOOLBAR_GROUP_CLASSES,
  MOUSE_ONLY_CLASSES,
} from '../../../constants/uiClasses'
import { Tooltip } from '../../atoms'
import { TOOL_ICONS } from './CanvasToolPicker.constants'
import type { CanvasToolPickerProps } from './CanvasToolPicker.types'

// Lo comparten las barras del formulario y del PDF; quien lo monta guarda la herramienta. La Mano
// no se muestra en tactil: el dedo ya desplaza (T8 y D5 de docs/Plan-Movil.md).
export function CanvasToolPicker({ tool, onSelect, allowSelect = true }: CanvasToolPickerProps) {
  const tools = allowSelect ? CANVAS_TOOLS : CANVAS_TOOLS.filter((item) => item.tool !== 'select')

  return (
    <div className={CANVAS_TOOLBAR_GROUP_CLASSES}>
      {tools.map((item) => {
        const Icon = TOOL_ICONS[item.tool]
        const isActive: boolean = tool === item.tool

        return (
          <Tooltip key={item.tool} content={`${item.label} (${item.shortcut})`}>
            <button
              type="button"
              onClick={() => onSelect(item.tool)}
              aria-pressed={isActive}
              aria-label={item.label}
              className={`${CANVAS_TOOL_BUTTON_BASE_CLASSES} ${
                isActive ? CANVAS_TOOL_BUTTON_ACTIVE_CLASSES : CANVAS_TOOL_BUTTON_INACTIVE_CLASSES
              } ${item.tool === 'hand' ? MOUSE_ONLY_CLASSES : ''}`}
            >
              <Icon size={16} />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
