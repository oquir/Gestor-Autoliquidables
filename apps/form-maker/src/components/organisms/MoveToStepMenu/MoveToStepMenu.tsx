import { useRef, useState } from 'react'
import { AngleDown2 } from 'reicon-react'
import { CANVAS_TOOLBAR_ACTION_CLASSES } from '../../../constants'
import { useClickOutside, useLayoutMode } from '../../../hooks'
import { useFormStore } from '../../../store'
import type { CanvasTarget } from '../../../types'
import {
  MENU_CAPTION_CLASSES,
  MENU_CLASSES,
  MENU_ITEM_CLASSES,
  MENU_NUMBER_CLASSES,
} from './MoveToStepMenu.constants'
import type { MoveTargetSection, MoveToStepMenuProps } from './MoveToStepMenu.types'
import { buildMoveSections } from './MoveToStepMenu.utils'
import { Tooltip } from '../../atoms'
import { MenuSurface } from '../../molecules'

export function MoveToStepMenu({
  onSelect,
  tooltip = 'Mover los campos seleccionados a otro paso',
  triggerClassName = CANVAS_TOOLBAR_ACTION_CLASSES,
  placement = 'up',
  disabled = false,
  isOpen: controlledOpen,
  onToggle,
  onClose,
}: MoveToStepMenuProps) {
  const formSteps = useFormStore((state) => state.formSteps)
  const introSteps = useFormStore((state) => state.introModal.steps)
  const activeCanvas = useFormStore((state) => state.activeCanvas)
  const [ownOpen, setOwnOpen] = useState<boolean>(false)
  const isOpen: boolean = controlledOpen ?? ownOpen
  const containerRef = useRef<HTMLDivElement | null>(null)
  // En el celular el menu es una hoja en un portal: un toque adentro contaria como afuera.
  const isPhone: boolean = useLayoutMode() === 'phone'

  function close(): void {
    if (onClose) onClose()
    else setOwnOpen(false)
  }

  function toggle(): void {
    if (onToggle) onToggle()
    else setOwnOpen((open) => !open)
  }

  useClickOutside(containerRef, close, isOpen && !isPhone)

  const sections: MoveTargetSection[] = buildMoveSections(formSteps, introSteps, activeCanvas)

  function apply(target: CanvasTarget): void {
    onSelect(target)
    close()
  }

  return (
    <div ref={containerRef} className="relative">
      <Tooltip content={tooltip}>
        <span className="inline-flex">
          <button
            type="button"
            onClick={toggle}
            disabled={disabled || sections.length === 0}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            className={triggerClassName}
          >
            Mover a paso
            <AngleDown2 size={12} />
          </button>
        </span>
      </Tooltip>

      {isOpen && (
        <MenuSurface
          title="Mover a paso"
          onClose={close}
          popoverClassName={MENU_CLASSES[placement]}
          sheetContentClassName="flex flex-col"
        >
          {sections.map((section) => (
            <div key={section.key} className="flex flex-col">
              {section.caption && <span className={MENU_CAPTION_CLASSES}>{section.caption}</span>}
              {section.options.map((option) => (
                <button
                  key={`${option.target.type}-${option.target.stepId}`}
                  type="button"
                  onClick={() => apply(option.target)}
                  className={MENU_ITEM_CLASSES}
                >
                  <span className={MENU_NUMBER_CLASSES}>{option.number}</span>
                  <span className="truncate">{option.title}</span>
                </button>
              ))}
            </div>
          ))}
        </MenuSurface>
      )}
    </div>
  )
}
