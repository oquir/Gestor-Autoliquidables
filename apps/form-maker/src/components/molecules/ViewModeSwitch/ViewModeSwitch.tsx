import { PHONE_VIEW_MODE_TABS, VIEW_MODE_TABS } from '../../../constants'
import {
  SWITCH_ITEM_ACTIVE_CLASSES,
  SWITCH_ITEM_BASE_CLASSES,
  SWITCH_ITEM_INACTIVE_CLASSES,
  SWITCH_TRACK_CLASSES,
} from '../../../constants/uiClasses'
import { useLayoutMode } from '../../../hooks'
import { VIEW_MODE_ICONS } from './ViewModeSwitch.constants'
import type { ViewModeSwitchProps } from './ViewModeSwitch.types'

export function ViewModeSwitch({ activeMode, onSelect }: ViewModeSwitchProps) {
  const isPhone: boolean = useLayoutMode() === 'phone'
  const tabs = isPhone ? PHONE_VIEW_MODE_TABS : VIEW_MODE_TABS

  return (
    <div className={SWITCH_TRACK_CLASSES}>
      {tabs.map((item) => {
        const Icon = VIEW_MODE_ICONS[item.tab]
        const isActive: boolean = activeMode === item.tab

        return (
          <button
            key={item.tab}
            type="button"
            onClick={() => onSelect(item.tab)}
            aria-pressed={isActive}
            className={`${SWITCH_ITEM_BASE_CLASSES} ${
              isActive ? SWITCH_ITEM_ACTIVE_CLASSES : SWITCH_ITEM_INACTIVE_CLASSES
            }`}
          >
            <Icon size={13} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
