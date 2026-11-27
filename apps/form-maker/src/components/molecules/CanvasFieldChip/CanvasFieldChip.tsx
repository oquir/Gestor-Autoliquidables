import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  type ComponentType,
  type CSSProperties,
  memo,
  type NamedExoticComponent,
  useCallback,
} from 'react'
import { BranchDown, Eye, InfoCircle, Lock, MoreH, Xmark } from 'reicon-react'
import { GRID_BASE_COLUMNS } from '../../../constants/grid'
import { CHROME_ON_FIELD_CLASSES, CHROME_PINNED_CLASSES } from '../../../constants/uiClasses'
import { resolveFieldStyles } from '../../../lib/cssStyles/cssStyles'
import { hasTooltip } from '../../../lib/fieldTooltip/fieldTooltip'
import { getFreeRuns, getMaxSpanAt } from '../../../lib/rowLayout/rowLayout'
import { useFormStore } from '../../../store/formStore'
import type { IconProps } from '../../../types/icon'
import { FieldDragHandle } from '../../atoms/FieldDragHandle/FieldDragHandle'
import { FieldResizeHandle } from '../../atoms/FieldResizeHandle/FieldResizeHandle'
import { FieldTypeBadge } from '../../atoms/FieldTypeBadge/FieldTypeBadge'
import { IconButton } from '../../atoms/IconButton/IconButton'
import { Tooltip } from '../../atoms/Tooltip'
import { FieldPreviewControl } from '../FieldPreviewControl/FieldPreviewControl'
import { TooltipBubble } from '../TooltipBubble/TooltipBubble'
import {
  DELETE_BUTTON_CLASSES,
  DESTINATION_COLOR_CLASSES,
  DESTINATION_ICONS,
  DESTINATION_SYMBOL_CLASSES,
  MENU_BUTTON_CLASSES,
  STATE_ICON_CLASSES,
} from './CanvasFieldChip.constants'
import type {
  CanvasFieldChipBodyProps,
  CanvasFieldChipProps,
  FieldDestination,
} from './CanvasFieldChip.types'
import {
  getChipBorderClasses,
  getChipPaddingClasses,
  getDestinationTitle,
  getFieldDestination,
} from './CanvasFieldChip.utils'
import { ENTER_FIELD_CLASSES } from '../../../constants'

function CanvasFieldChipBase({
  field,
  rowId,
  rowColumns,
  rowFields,
  linkedLabel,
  selected,
  pinned,
  onChipClick,
  onChipContextMenu,
}: CanvasFieldChipProps) {
  const {
    listeners,
    attributes,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: field.id,
    data: { source: 'canvas-field', field, rowId },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: field.id,
    data: { rowId, fieldId: field.id },
  })

  const setRefs = useCallback(
    (node: HTMLDivElement | null): void => {
      setDragRef(node)
      setDropRef(node)
    },
    [setDragRef, setDropRef],
  )

  return (
    <div
      ref={setRefs}
      data-field-id={field.id}
      style={{ gridColumn: `${field.colStart} / span ${field.colSpan}`, gridRow: 1 }}
      // group con nombre: uno a secas encenderia el cromo de todos los campos al pasar por la fila.
      className={`group/field relative min-w-0 ${ENTER_FIELD_CLASSES} ${isDragging ? 'opacity-40' : ''}`}
    >
      <CanvasFieldChipBody
        field={field}
        rowColumns={rowColumns}
        rowFields={rowFields}
        linkedLabel={linkedLabel}
        selected={selected}
        pinned={pinned}
        isOver={isOver}
        listeners={listeners}
        attributes={attributes}
        onChipClick={onChipClick}
        onChipContextMenu={onChipContextMenu}
      />
    </div>
  )
}

function CanvasFieldChipBodyBase({
  field,
  rowColumns,
  rowFields,
  linkedLabel,
  selected,
  pinned,
  isOver,
  listeners,
  attributes,
  onChipClick,
  onChipContextMenu,
}: CanvasFieldChipBodyProps) {
  const updateField = useFormStore((state) => state.updateField)
  const removeFields = useFormStore((state) => state.removeFields)
  const selectFieldAndEdit = useFormStore((state) => state.selectFieldAndEdit)
  const maxSpan = getMaxSpanAt(getFreeRuns(rowFields, rowColumns, field.id), field.colStart)

  const isUltraCompact = field.colSpan === 1 && rowColumns >= GRID_BASE_COLUMNS
  const isCompact = rowColumns >= 13 && field.colSpan === 1
  const shouldHideContent = field.colSpan === 1 && rowColumns >= 14
  const showTooltip: boolean = hasTooltip(field)
  const destination: FieldDestination = getFieldDestination(field)
  const DestinationIcon: ComponentType<IconProps> | undefined = DESTINATION_ICONS[destination]
  const destinationTitle: string = getDestinationTitle(field, destination)
  // Los margenes van en el div relative (con handle y resize); el resto del estilo en la caja
  // pintada, nunca en el div con gridColumn.
  const { marginTop, marginBottom, ...buttonStyles } = resolveFieldStyles(field.styles)
  const chromeClasses: string = pinned ? CHROME_PINNED_CLASSES : CHROME_ON_FIELD_CLASSES

  return (
    <div
      className={`relative group/tooltip ${isOver ? 'rounded-md outline-2 outline-brand' : ''}`}
      style={{ marginTop, marginBottom }}
    >
      <FieldDragHandle
        listeners={listeners}
        attributes={attributes}
        colSpan={field.colSpan}
        rowColumns={rowColumns}
        pinned={pinned}
      />
      <button
        type="button"
        onClick={(event) => onChipClick(event, field.id)}
        onDoubleClick={() => selectFieldAndEdit(field.id, 'attributes')}
        onContextMenu={(event) => onChipContextMenu(event, field.id)}
        style={buttonStyles as CSSProperties}
        className={`relative flex w-full flex-col rounded-md border bg-white py-3 text-left shadow-sm transition-colors dark:bg-neutral-800 ${getChipPaddingClasses(
          isCompact,
          isUltraCompact,
        )} ${getChipBorderClasses(selected, destination)}`}
      >
        <div className="@container flex flex-col gap-1.5">
          <div
            className={`flex flex-wrap items-start gap-x-2 overflow-hidden ${shouldHideContent ? 'opacity-0' : ''}`}
          >
            <div className="flex w-min min-w-0 grow items-center gap-1">
              {linkedLabel ? (
                <Tooltip content={`La etiqueta la aporta "${linkedLabel.label}"`}>
                  <p className="text-sm font-medium italic text-fg-muted">{linkedLabel.label}</p>
                </Tooltip>
              ) : (
                <p className="text-sm font-medium text-slate-700 dark:text-neutral-200">
                  {field.label}
                </p>
              )}
              {showTooltip && <InfoCircle size={12} className="shrink-0 text-fg-subtle" />}
            </div>
            {/* Los iconos solo se ven si caben junto a la palabra mas larga del nombre
                (w-min): si no, flex-wrap los baja a una linea de alto cero que overflow-hidden
                oculta. */}
            <div className="ml-auto h-0 shrink-0">
              <div className="flex h-5 items-center gap-1.5">
                {field.visibleWhen && (
                  <Tooltip content="Visibilidad condicional">
                    <span className={STATE_ICON_CLASSES}>
                      <Eye size={11} weight="Filled" />
                    </span>
                  </Tooltip>
                )}
                {field.alwaysDisabled && (
                  <Tooltip content="Siempre deshabilitado (solo lectura)">
                    <span className={STATE_ICON_CLASSES}>
                      <Lock size={11} weight="Filled" />
                    </span>
                  </Tooltip>
                )}
                {!field.alwaysDisabled && field.enableWhen && (
                  <Tooltip content="Habilitación condicional">
                    <span className={STATE_ICON_CLASSES}>
                      <BranchDown size={11} weight="Filled" />
                    </span>
                  </Tooltip>
                )}
                <FieldTypeBadge type={field.type} />
              </div>
            </div>
          </div>
          <div className={shouldHideContent ? 'opacity-0' : ''}>
            <FieldPreviewControl field={field} />
          </div>
        </div>
        {shouldHideContent && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <FieldTypeBadge type={field.type} size={14} />
          </span>
        )}
        {DestinationIcon && (
          <Tooltip content={destinationTitle}>
            <span
              role="img"
              aria-label={destinationTitle}
              className={`${DESTINATION_SYMBOL_CLASSES} ${DESTINATION_COLOR_CLASSES[destination]}`}
            >
              <DestinationIcon size={12} />
            </span>
          </Tooltip>
        )}
      </button>
      {showTooltip && field.tooltip && <TooltipBubble tooltip={field.tooltip} />}
      {pinned && (
        <IconButton
          data-field-chrome
          onClick={(event) => onChipContextMenu(event, field.id)}
          title="Más opciones del campo"
          aria-label="Más opciones del campo"
          touchTarget={false}
          className={MENU_BUTTON_CLASSES}
        >
          <MoreH size={12} />
        </IconButton>
      )}
      <IconButton
        data-field-chrome
        onClick={() => removeFields([field.id])}
        title="Eliminar campo"
        aria-label="Eliminar campo"
        touchTarget={false}
        className={`${DELETE_BUTTON_CLASSES} ${chromeClasses}`}
      >
        <Xmark size={11} weight="Filled" />
      </IconButton>
      <FieldResizeHandle
        colSpan={field.colSpan}
        rowColumns={rowColumns}
        maxSpan={maxSpan}
        pinned={pinned}
        onResize={(next) => updateField(field.id, { colSpan: next })}
      />
    </div>
  )
}

// Lo que se pinta, aparte de los hooks de dnd-kit: esos repintan el chip en cada cambio de estado
// del arrastre (el activo, las medidas, el destino) aunque no lo toque, y el memo deja el cuerpo
// (badges, Tooltip, la vista previa del control) para cuando cambian sus props (auditoria O2).
// Funciona porque la fila le pasa manejadores estables.
const CanvasFieldChipBody: NamedExoticComponent<CanvasFieldChipBodyProps> =
  memo(CanvasFieldChipBodyBase)

// Memo tambien afuera: un cambio de seleccion repinta todas las filas y solo deben repintarse los
// chips cuyo selected o pinned cambio.
export const CanvasFieldChip: NamedExoticComponent<CanvasFieldChipProps> = memo(CanvasFieldChipBase)
