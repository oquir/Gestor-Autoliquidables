import { memo, type NamedExoticComponent, useState } from 'react'
import { MoreH, Trash6 } from 'reicon-react'
import {
  CHROME_ON_ROW_CLASSES,
  CHROME_PINNED_CLASSES,
  ROW_TOOLBAR_ICON_ITEM_CLASSES,
} from '../../../constants'
import { useFormStore } from '../../../store'
import { IconButton } from '../../atoms'
import { RowDragHandle } from '../../atoms'
import { RowColumnsMenu } from '../RowColumnsMenu'
import { RowStylesMenu } from '../RowStylesMenu'
import {
  ROW_TOOLBAR_CLASSES,
  ROW_TOOLBAR_COLLAPSIBLE_CLASSES,
  ROW_TOOLBAR_DANGER_ITEM_CLASSES,
  ROW_TOOLBAR_MORE_CLASSES,
} from './RowToolbar.constants'
import type { RowToolbarMenu, RowToolbarProps } from './RowToolbar.types'

function RowToolbarBase({ row, listeners, attributes, pinned }: RowToolbarProps) {
  const removeRow = useFormStore((state) => state.removeRow)
  // El estado de los menus vive aca: son excluyentes y la barra no se desvanece mientras hay uno
  // abierto.
  const [openMenu, setOpenMenu] = useState<RowToolbarMenu | null>(null)
  // Solo tactil: el ⋯ de la barra compacta. Con mouse la barra siempre esta entera.
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  function toggleMenu(menu: RowToolbarMenu): void {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  const isVisible: boolean = pinned || openMenu !== null
  const isFull: boolean = isVisible || isExpanded

  return (
    <div
      className={`${ROW_TOOLBAR_CLASSES} ${isVisible ? CHROME_PINNED_CLASSES : CHROME_ON_ROW_CLASSES}`}
    >
      <RowDragHandle listeners={listeners} attributes={attributes} />

      <div className={isFull ? 'contents' : ROW_TOOLBAR_COLLAPSIBLE_CLASSES}>
        <RowColumnsMenu
          rowId={row.id}
          columns={row.columns}
          isOpen={openMenu === 'columns'}
          onToggle={() => toggleMenu('columns')}
          onClose={() => setOpenMenu(null)}
        />

        <RowStylesMenu
          rowId={row.id}
          styles={row.styles}
          isOpen={openMenu === 'styles'}
          onToggle={() => toggleMenu('styles')}
          onClose={() => setOpenMenu(null)}
        />

        <IconButton
          onClick={() => removeRow(row.id)}
          title="Eliminar fila"
          aria-label="Eliminar fila"
          className={ROW_TOOLBAR_DANGER_ITEM_CLASSES}
        >
          <Trash6 size={13} />
        </IconButton>
      </div>

      {!isVisible && (
        <span className={ROW_TOOLBAR_MORE_CLASSES}>
          <IconButton
            onClick={() => setIsExpanded((current) => !current)}
            title={isExpanded ? 'Menos acciones' : 'Más acciones de la fila'}
            aria-expanded={isExpanded}
            className={ROW_TOOLBAR_ICON_ITEM_CLASSES}
          >
            <MoreH size={13} />
          </IconButton>
        </span>
      )}
    </div>
  )
}

// Memo: durante un arrastre la fila se repinta en cada cambio de estado de dnd-kit, y la barra (asa,
// dos menus y borrar) no depende de eso (auditoria O2).
export const RowToolbar: NamedExoticComponent<RowToolbarProps> = memo(RowToolbarBase)
