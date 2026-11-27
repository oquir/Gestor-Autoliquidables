import {
  type ComponentType,
  type PointerEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AngleDown2,
  AngleUp2,
  BranchDown,
  Eye,
  Grid,
  InfoCircle,
  Layers,
  Lock,
  MoreH,
  Palette,
  Plus,
  Trash6,
} from 'reicon-react'
import {
  FIELD_TYPE_ICONS,
  FIELD_TYPES,
  MAX_ROW_COLUMNS,
  MIN_ROW_COLUMNS,
  PAYLOAD_SCHEMA,
  SELECT_CLASSES,
} from '../../../constants'
import { useCanvasReveal } from '../../../hooks'
import { arrayPaths, buildCanvasList, buildLinkedLabelIndex, hasTooltip } from '../../../lib'
import {
  findFieldById,
  getActiveGroups,
  getActiveRows,
  getAllFields,
  useFormStore,
} from '../../../store'
import type {
  CanvasField,
  CanvasListItem,
  CanvasRow,
  FieldTypeDef,
  IconProps,
  RepeatableGroup,
  RowDropTarget,
} from '../../../types'
import {
  FieldTypeBadge,
  IconButton,
  Input,
  Label,
  Textarea,
  Tooltip,
  TwoColumnFieldGroup,
} from '../../atoms'
import { BottomSheet, CssValidationHint, PxInput } from '../../molecules'
import { FieldEditorSheet } from '../FieldEditorSheet'
import { GroupChecksEditor } from '../panels/GroupChecksEditor'
import {
  ADD_FIELD_BUTTON_CLASSES,
  CATEGORY_HEADINGS,
  CATEGORY_ORDER,
  DESTINATION_COLOR_CLASSES,
  DESTINATION_ICONS,
  EMPTY_STATE_CLASSES,
  FIELD_BUTTON_CLASSES,
  FIELD_DEFAULT_CLASSES,
  FIELD_INTERNAL_CLASSES,
  FIELD_META_CLASSES,
  FIELD_SELECTED_CLASSES,
  GROUP_HEADER_CLASSES,
  GROUP_SECTION_CLASSES,
  INTRO_BANNER_CLASSES,
  LIST_CONTAINER_CLASSES,
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_TOLERANCE_PX,
  LONG_PRESS_VIBRATE_MS,
  MOVE_CAPTION_CLASSES,
  MOVE_ITEM_CLASSES,
  MOVE_NUMBER_CLASSES,
  ROW_CARD_CLASSES,
  ROW_HEADER_CLASSES,
  ROW_MORE_BUTTON_CLASSES,
  ROW_MOVE_BUTTON_CLASSES,
  ROW_TITLE_CLASSES,
  SHEET_ACTION_CLASSES,
  SHEET_DANGER_ACTION_CLASSES,
} from './CanvasList.constants'
import type {
  CanvasListRowCardProps,
  FieldDestination,
  MoveSection,
  RowSheetState,
} from './CanvasList.types'
import {
  buildMoveSections,
  canPlaceFieldInRow,
  getDestinationTitle,
  getFieldDestination,
  hasRowFreeSpace,
} from './CanvasList.utils'

function CanvasListRowCard({
  row,
  rowNumber,
  fields,
  moveUp,
  moveDown,
  linkedLabels,
  selectedSet,
  isSelecting,
  onFieldClick,
  onFieldLongPress,
  onMoveRow,
  onOpenRowMenu,
}: CanvasListRowCardProps) {
  const columnsLabel: string = row.columns === 1 ? '1 columna' : `${row.columns} columnas`
  const pressTimerRef = useRef<number | null>(null)
  const pressStartRef = useRef<{ x: number; y: number } | null>(null)
  const longPressedRef = useRef<boolean>(false)

  function clearPressTimer(): void {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    pressStartRef.current = null
  }

  function handleFieldPointerDown(event: PointerEvent<HTMLButtonElement>, fieldId: string): void {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    clearPressTimer()
    longPressedRef.current = false
    pressStartRef.current = { x: event.clientX, y: event.clientY }
    pressTimerRef.current = window.setTimeout(() => {
      longPressedRef.current = true
      pressTimerRef.current = null
      pressStartRef.current = null
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(LONG_PRESS_VIBRATE_MS)
      }
      onFieldLongPress(fieldId)
    }, LONG_PRESS_DELAY_MS)
  }

  function handleFieldPointerMove(event: PointerEvent<HTMLButtonElement>): void {
    const start = pressStartRef.current
    if (!start) return
    const dx: number = event.clientX - start.x
    const dy: number = event.clientY - start.y
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOLERANCE_PX) clearPressTimer()
  }

  return (
    <article data-row-id={row.id} data-canvas-row={row.id} className={ROW_CARD_CLASSES}>
      <div className={ROW_HEADER_CLASSES}>
        <span className={ROW_TITLE_CLASSES}>
          Fila {rowNumber} · {columnsLabel}
        </span>
        <div className="flex items-center gap-0.5">
          <IconButton
            onClick={() => moveUp && onMoveRow(row.id, moveUp)}
            disabled={!moveUp}
            title="Subir fila"
            aria-label={`Subir fila ${rowNumber}`}
            className={ROW_MOVE_BUTTON_CLASSES}
          >
            <AngleUp2 size={15} />
          </IconButton>
          <IconButton
            onClick={() => moveDown && onMoveRow(row.id, moveDown)}
            disabled={!moveDown}
            title="Bajar fila"
            aria-label={`Bajar fila ${rowNumber}`}
            className={ROW_MOVE_BUTTON_CLASSES}
          >
            <AngleDown2 size={15} />
          </IconButton>
          <IconButton
            onClick={() => onOpenRowMenu(row.id)}
            title="Acciones de la fila"
            aria-label={`Acciones de la fila ${rowNumber}`}
            className={ROW_MORE_BUTTON_CLASSES}
          >
            <MoreH size={16} />
          </IconButton>
        </div>
      </div>

      {fields.length === 0 ? (
        <p className="py-1 text-xs text-fg-subtle">Fila vacía</p>
      ) : (
        <ul className="flex list-none flex-col gap-2">
          {fields.map((field) => {
            const linkedLabel: CanvasField | undefined = linkedLabels.get(field.id)
            const selected: boolean = selectedSet.has(field.id)
            const destination: FieldDestination = getFieldDestination(field)
            const DestinationIcon: ComponentType<IconProps> | undefined =
              DESTINATION_ICONS[destination]
            const destinationTitle: string = getDestinationTitle(field, destination)
            const borderClasses: string = selected
              ? FIELD_SELECTED_CLASSES
              : destination === 'internal'
                ? FIELD_INTERNAL_CLASSES
                : FIELD_DEFAULT_CLASSES

            return (
              <li key={field.id} data-field-id={field.id}>
                <button
                  type="button"
                  onPointerDown={(event) => handleFieldPointerDown(event, field.id)}
                  onPointerMove={handleFieldPointerMove}
                  onPointerUp={clearPressTimer}
                  onPointerCancel={clearPressTimer}
                  onPointerLeave={clearPressTimer}
                  onContextMenu={(event) => event.preventDefault()}
                  onClick={() => {
                    if (longPressedRef.current) {
                      longPressedRef.current = false
                      return
                    }
                    onFieldClick(field.id)
                  }}
                  aria-pressed={selected}
                  className={`${FIELD_BUTTON_CLASSES} ${borderClasses}`}
                >
                  {isSelecting && (
                    <input
                      type="checkbox"
                      readOnly
                      checked={selected}
                      tabIndex={-1}
                      aria-hidden
                      className="pointer-events-none h-5 w-5 shrink-0 accent-brand"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {linkedLabel ? (
                        <Tooltip content={`La etiqueta la aporta "${linkedLabel.label}"`}>
                          <span className="truncate text-sm font-medium italic text-fg-muted">
                            {linkedLabel.label}
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="truncate text-sm font-medium text-fg-strong">
                          {field.label}
                        </span>
                      )}
                      {hasTooltip(field) && (
                        <InfoCircle size={13} className="shrink-0 text-fg-subtle" />
                      )}
                    </div>
                    <span className={FIELD_META_CLASSES}>
                      {field.colSpan}/{row.columns} · col {field.colStart}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {field.visibleWhen && (
                      <Tooltip content="Visibilidad condicional">
                        <span className="flex items-center text-fg-subtle">
                          <Eye size={12} weight="Filled" />
                        </span>
                      </Tooltip>
                    )}
                    {field.alwaysDisabled && (
                      <Tooltip content="Siempre deshabilitado (solo lectura)">
                        <span className="flex items-center text-fg-subtle">
                          <Lock size={12} weight="Filled" />
                        </span>
                      </Tooltip>
                    )}
                    {!field.alwaysDisabled && field.enableWhen && (
                      <Tooltip content="Habilitación condicional">
                        <span className="flex items-center text-fg-subtle">
                          <BranchDown size={12} weight="Filled" />
                        </span>
                      </Tooltip>
                    )}
                    {DestinationIcon && (
                      <Tooltip content={destinationTitle}>
                        <span
                          role="img"
                          aria-label={destinationTitle}
                          className={`flex items-center ${DESTINATION_COLOR_CLASSES[destination] ?? ''}`}
                        >
                          <DestinationIcon size={12} />
                        </span>
                      </Tooltip>
                    )}
                    <FieldTypeBadge type={field.type} size={14} />
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}

export function CanvasList() {
  const activeRows = useFormStore(getActiveRows)
  const activeGroups = useFormStore(getActiveGroups)
  const activeCanvas = useFormStore((state) => state.activeCanvas)
  const formSteps = useFormStore((state) => state.formSteps)
  const introSteps = useFormStore((state) => state.introModal.steps)
  const selectedFieldIds = useFormStore((state) => state.selectedFieldIds)
  const canvasTool = useFormStore((state) => state.canvasTool)
  const selectField = useFormStore((state) => state.selectField)
  const toggleFieldSelection = useFormStore((state) => state.toggleFieldSelection)
  const moveRow = useFormStore((state) => state.moveRow)
  const moveField = useFormStore((state) => state.moveField)
  const updateRowColumns = useFormStore((state) => state.updateRowColumns)
  const updateRowStyles = useFormStore((state) => state.updateRowStyles)
  const moveRowToStep = useFormStore((state) => state.moveRowToStep)
  const removeRow = useFormStore((state) => state.removeRow)
  const addFieldToRow = useFormStore((state) => state.addFieldToRow)
  const updateGroup = useFormStore((state) => state.updateGroup)
  const addRowToGroup = useFormStore((state) => state.addRowToGroup)
  const removeGroup = useFormStore((state) => state.removeGroup)
  const isLowPerformance = useFormStore((state) => state.isLowPerformance)
  const reveal = useCanvasReveal()

  const listRef = useRef<HTMLDivElement | null>(null)
  const pendingFlipRef = useRef<Map<string, number> | null>(null)
  const [rowSheet, setRowSheet] = useState<RowSheetState | null>(null)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [isMoveFieldRowOpen, setMoveFieldRowOpen] = useState<boolean>(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  const items: CanvasListItem[] = useMemo(
    () => buildCanvasList(activeRows, activeGroups),
    [activeRows, activeGroups],
  )
  const linkedLabels: Map<string, CanvasField> = useMemo(
    () => buildLinkedLabelIndex(getAllFields(activeRows)),
    [activeRows],
  )
  const selectedSet: Set<string> = useMemo(() => new Set(selectedFieldIds), [selectedFieldIds])
  const moveSections: MoveSection[] = useMemo(
    () => buildMoveSections(formSteps, introSteps, activeCanvas),
    [formSteps, introSteps, activeCanvas],
  )

  const activeSheetRow: CanvasRow | undefined = rowSheet
    ? activeRows.find((row) => row.id === rowSheet.rowId)
    : undefined
  const activeSheetRowNumber: number = activeSheetRow ? activeRows.indexOf(activeSheetRow) + 1 : 0
  const editingField: CanvasField | null = editingFieldId
    ? findFieldById(activeRows, editingFieldId)
    : null
  const editingGroup: RepeatableGroup | undefined = editingGroupId
    ? activeGroups.find((group) => group.id === editingGroupId)
    : undefined
  const groupArrayPaths: string[] = useMemo(() => arrayPaths(PAYLOAD_SCHEMA), [])

  function handleFieldClick(fieldId: string): void {
    if (canvasTool === 'select') {
      toggleFieldSelection(fieldId)
      return
    }
    selectField(fieldId)
  }

  function handleFieldLongPress(fieldId: string): void {
    if (canvasTool === 'select') return
    selectField(fieldId)
    setMoveFieldRowOpen(false)
    setEditingFieldId(fieldId)
  }

  function handleMoveRow(rowId: string, target: RowDropTarget): void {
    if (!isLowPerformance && listRef.current) {
      const snapshot: Map<string, number> = new Map()
      for (const el of listRef.current.querySelectorAll<HTMLElement>('[data-row-id]')) {
        const id: string | undefined = el.dataset.rowId
        if (id) snapshot.set(id, el.getBoundingClientRect().top)
      }
      pendingFlipRef.current = snapshot
    }
    moveRow(rowId, target)
    reveal({ kind: 'row', id: rowId })
  }

  useLayoutEffect(() => {
    const snapshot: Map<string, number> | null = pendingFlipRef.current
    pendingFlipRef.current = null
    if (!snapshot || isLowPerformance || !listRef.current) return

    const animated: HTMLElement[] = []
    for (const el of listRef.current.querySelectorAll<HTMLElement>('[data-row-id]')) {
      const id: string | undefined = el.dataset.rowId
      if (!id) continue
      const prevTop: number | undefined = snapshot.get(id)
      if (prevTop === undefined) continue
      const deltaY: number = prevTop - el.getBoundingClientRect().top
      if (Math.abs(deltaY) < 1) continue

      el.style.transition = 'none'
      el.style.transform = `translateY(${deltaY}px)`
      animated.push(el)
    }

    if (animated.length === 0) return
    void listRef.current.offsetHeight

    const frame: number = requestAnimationFrame(() => {
      for (const el of animated) {
        el.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)'
        el.style.transform = ''
        el.addEventListener(
          'transitionend',
          () => {
            el.style.transition = ''
          },
          { once: true },
        )
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [activeRows, isLowPerformance])

  function closeSheet(): void {
    setRowSheet(null)
  }

  return (
    <div ref={listRef} className={LIST_CONTAINER_CLASSES}>
      {activeCanvas.type === 'introStep' && (
        <div className={INTRO_BANNER_CLASSES}>
          <span className="h-2 w-2 rounded-full bg-brand" />
          Modal de entrada
        </div>
      )}

      {items.length === 0 ? (
        <p className={EMPTY_STATE_CLASSES}>
          Este paso no tiene filas todavía. Toca Agregar abajo para sumar un campo.
        </p>
      ) : (
        items.map((item) => {
          if (item.kind === 'row') {
            return (
              <CanvasListRowCard
                key={item.row.row.id}
                row={item.row.row}
                rowNumber={item.row.number}
                fields={item.row.fields}
                moveUp={item.row.moveUp}
                moveDown={item.row.moveDown}
                linkedLabels={linkedLabels}
                selectedSet={selectedSet}
                isSelecting={canvasTool === 'select'}
                onFieldClick={handleFieldClick}
                onFieldLongPress={handleFieldLongPress}
                onMoveRow={handleMoveRow}
                onOpenRowMenu={(rowId) => setRowSheet({ rowId, mode: 'actions' })}
              />
            )
          }

          return (
            <section
              key={item.group.id}
              data-band-id={item.group.id}
              className={GROUP_SECTION_CLASSES}
            >
              <header className={GROUP_HEADER_CLASSES}>
                <span className="flex min-w-0 items-center gap-1.5 font-semibold text-fg-strong">
                  <Layers size={14} weight="Filled" className="shrink-0 text-fg-muted" />
                  <span className="truncate">{item.group.title.trim() || 'Grupo repetible'}</span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-[11px] tabular-nums">
                    {item.group.min}–{item.group.max}
                  </span>
                  <IconButton
                    onClick={() => setEditingGroupId(item.group.id)}
                    title="Configurar grupo repetible"
                    aria-label={`Acciones del grupo ${item.group.title.trim() || 'repetible'}`}
                    className={ROW_MORE_BUTTON_CLASSES}
                  >
                    <MoreH size={16} />
                  </IconButton>
                </div>
              </header>
              <div className="flex flex-col gap-2">
                {item.rows.map((listRow) => (
                  <CanvasListRowCard
                    key={listRow.row.id}
                    row={listRow.row}
                    rowNumber={listRow.number}
                    fields={listRow.fields}
                    moveUp={listRow.moveUp}
                    moveDown={listRow.moveDown}
                    linkedLabels={linkedLabels}
                    selectedSet={selectedSet}
                    isSelecting={canvasTool === 'select'}
                    onFieldClick={handleFieldClick}
                    onFieldLongPress={handleFieldLongPress}
                    onMoveRow={handleMoveRow}
                    onOpenRowMenu={(rowId) => setRowSheet({ rowId, mode: 'actions' })}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      {rowSheet?.mode === 'actions' && activeSheetRow && (
        <BottomSheet
          title={`Fila ${activeSheetRowNumber} · ${activeSheetRow.columns} col`}
          size="peek"
          onClose={closeSheet}
        >
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setRowSheet({ rowId: activeSheetRow.id, mode: 'columns' })}
              className={SHEET_ACTION_CLASSES}
            >
              <Grid size={16} />
              Columnas ({activeSheetRow.columns})
            </button>
            <button
              type="button"
              onClick={() => setRowSheet({ rowId: activeSheetRow.id, mode: 'styles' })}
              className={SHEET_ACTION_CLASSES}
            >
              <Palette size={16} />
              Estilos
            </button>
            <button
              type="button"
              disabled={activeSheetRow.groupId !== undefined || moveSections.length === 0}
              onClick={() => setRowSheet({ rowId: activeSheetRow.id, mode: 'move' })}
              className={SHEET_ACTION_CLASSES}
            >
              <Layers size={16} />
              Mover a paso
            </button>
            <button
              type="button"
              disabled={!hasRowFreeSpace(activeSheetRow)}
              onClick={() => setRowSheet({ rowId: activeSheetRow.id, mode: 'addField' })}
              className={SHEET_ACTION_CLASSES}
            >
              <Plus size={16} />
              Agregar campo aquí
            </button>
            <button
              type="button"
              onClick={() => {
                removeRow(activeSheetRow.id)
                closeSheet()
              }}
              className={SHEET_DANGER_ACTION_CLASSES}
            >
              <Trash6 size={16} />
              Eliminar fila
            </button>
          </div>
        </BottomSheet>
      )}

      {rowSheet?.mode === 'columns' && activeSheetRow && (
        <BottomSheet title="Columnas de la fila" size="peek" onClose={closeSheet}>
          <div className="flex flex-col gap-3">
            <label
              htmlFor={`list-row-columns-${activeSheetRow.id}`}
              className="text-xs font-medium text-fg-muted"
            >
              Cantidad de columnas ({MIN_ROW_COLUMNS}–{MAX_ROW_COLUMNS})
            </label>
            <div className="flex items-center gap-3">
              <input
                id={`list-row-columns-${activeSheetRow.id}`}
                type="number"
                min={MIN_ROW_COLUMNS}
                max={MAX_ROW_COLUMNS}
                value={activeSheetRow.columns}
                onChange={(event) => {
                  const parsed: number = Number.parseInt(event.target.value, 10)
                  if (Number.isNaN(parsed)) return
                  updateRowColumns(activeSheetRow.id, parsed)
                }}
                className="w-16 rounded-md border border-border bg-field px-2 py-1.5 text-sm text-fg outline-none focus:border-brand-border pointer-coarse:text-base"
              />
              <input
                type="range"
                min={MIN_ROW_COLUMNS}
                max={MAX_ROW_COLUMNS}
                value={activeSheetRow.columns}
                onChange={(event) =>
                  updateRowColumns(activeSheetRow.id, Number.parseInt(event.target.value, 10))
                }
                className="flex-1 accent-brand"
              />
            </div>
            <p className="text-xs text-fg-muted">
              Los campos que excedan se ajustan automáticamente.
            </p>
          </div>
        </BottomSheet>
      )}

      {rowSheet?.mode === 'styles' && activeSheetRow && (
        <BottomSheet title="Estilos de la fila" size="half" onClose={closeSheet}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`list-row-css-${activeSheetRow.id}`}>CSS personalizado</Label>
              <Textarea
                id={`list-row-css-${activeSheetRow.id}`}
                aria-label="CSS personalizado de la fila"
                value={activeSheetRow.styles?.customCss ?? ''}
                onChange={(event) =>
                  updateRowStyles(activeSheetRow.id, { customCss: event.target.value })
                }
                placeholder={'background: #f8fafc;\nborder-radius: 8px;'}
                spellCheck={false}
                rows={3}
                variant="code"
              />
              <CssValidationHint text={activeSheetRow.styles?.customCss ?? ''} />
            </div>

            <TwoColumnFieldGroup legend="Márgenes">
              <PxInput
                id={`list-row-margin-top-${activeSheetRow.id}`}
                label="Superior"
                value={activeSheetRow.styles?.marginTop ?? ''}
                onChange={(value) => updateRowStyles(activeSheetRow.id, { marginTop: value })}
              />
              <PxInput
                id={`list-row-margin-bottom-${activeSheetRow.id}`}
                label="Inferior"
                value={activeSheetRow.styles?.marginBottom ?? ''}
                onChange={(value) => updateRowStyles(activeSheetRow.id, { marginBottom: value })}
              />
            </TwoColumnFieldGroup>
          </div>
        </BottomSheet>
      )}

      {rowSheet?.mode === 'move' && activeSheetRow && (
        <BottomSheet title="Mover fila a paso" size="half" onClose={closeSheet}>
          <div className="flex flex-col">
            {moveSections.map((section) => (
              <div key={section.key} className="flex flex-col">
                {section.caption && <span className={MOVE_CAPTION_CLASSES}>{section.caption}</span>}
                {section.options.map((option) => (
                  <button
                    key={`${option.target.type}-${option.target.stepId}`}
                    type="button"
                    onClick={() => {
                      moveRowToStep(activeSheetRow.id, option.target)
                      closeSheet()
                    }}
                    className={MOVE_ITEM_CLASSES}
                  >
                    <span className={MOVE_NUMBER_CLASSES}>{option.number}</span>
                    <span className="truncate">{option.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </BottomSheet>
      )}

      {rowSheet?.mode === 'addField' && activeSheetRow && (
        <BottomSheet
          title={`Agregar a Fila ${activeSheetRowNumber}`}
          size="full"
          onClose={closeSheet}
        >
          <div className="flex flex-col gap-4">
            {CATEGORY_ORDER.map((category) => {
              const fieldsInCategory: FieldTypeDef[] = FIELD_TYPES.filter(
                (fieldType) => fieldType.category === category,
              )
              if (fieldsInCategory.length === 0) return null

              return (
                <section key={category} className="flex flex-col gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                    {CATEGORY_HEADINGS[category]}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {fieldsInCategory.map((fieldType) => {
                      const Icon: ComponentType<IconProps> | undefined =
                        FIELD_TYPE_ICONS[fieldType.type]

                      return (
                        <button
                          key={fieldType.type}
                          type="button"
                          onClick={() => {
                            addFieldToRow(activeSheetRow.id, fieldType)
                            closeSheet()
                          }}
                          className={ADD_FIELD_BUTTON_CLASSES}
                        >
                          {Icon && <Icon size={16} className="shrink-0 text-fg-muted" />}
                          <span className="truncate">{fieldType.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        </BottomSheet>
      )}

      {editingField && (
        <FieldEditorSheet
          field={editingField}
          onClose={() => {
            setMoveFieldRowOpen(false)
            setEditingFieldId(null)
          }}
          onMoveToRow={activeRows.length >= 2 ? () => setMoveFieldRowOpen(true) : undefined}
        />
      )}

      {isMoveFieldRowOpen && editingField && (
        <BottomSheet
          title="Mover a otra fila"
          size="half"
          onClose={() => setMoveFieldRowOpen(false)}
        >
          <div className="flex flex-col gap-1">
            {activeRows.map((candidateRow, index) => {
              const isCurrent: boolean = candidateRow.fields.some(
                (candidateField) => candidateField.id === editingField.id,
              )
              if (isCurrent) return null

              const fits: boolean = canPlaceFieldInRow(candidateRow, editingField)
              const groupTitle: string | undefined = candidateRow.groupId
                ? activeGroups.find((g) => g.id === candidateRow.groupId)?.title.trim() ||
                  'Grupo repetible'
                : undefined

              return (
                <button
                  key={candidateRow.id}
                  type="button"
                  disabled={!fits}
                  onClick={() => {
                    moveField(editingField.id, candidateRow.id)
                    setMoveFieldRowOpen(false)
                    setEditingFieldId(null)
                    reveal({ kind: 'row', id: candidateRow.id })
                  }}
                  className={SHEET_ACTION_CLASSES}
                >
                  <span className={MOVE_NUMBER_CLASSES}>{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate">
                    Fila {index + 1} · {candidateRow.columns} col
                    {groupTitle ? ` · ${groupTitle}` : ''}
                  </span>
                  {!fits && <span className="shrink-0 text-xs text-fg-subtle">Sin espacio</span>}
                </button>
              )
            })}
          </div>
        </BottomSheet>
      )}

      {editingGroup && (
        <BottomSheet
          title={editingGroup.title.trim() || 'Grupo repetible'}
          size="full"
          onClose={() => setEditingGroupId(null)}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`list-group-title-${editingGroup.id}`}>Título del grupo</Label>
              <Input
                id={`list-group-title-${editingGroup.id}`}
                value={editingGroup.title}
                onChange={(event) => updateGroup(editingGroup.id, { title: event.target.value })}
                placeholder="Título del grupo"
              />
            </div>

            <TwoColumnFieldGroup legend="Repeticiones">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`list-group-min-${editingGroup.id}`}>Mínimo</Label>
                <Input
                  id={`list-group-min-${editingGroup.id}`}
                  type="number"
                  min={0}
                  value={editingGroup.min}
                  onChange={(event) =>
                    updateGroup(editingGroup.id, { min: Number(event.target.value) })
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`list-group-max-${editingGroup.id}`}>Máximo</Label>
                <Input
                  id={`list-group-max-${editingGroup.id}`}
                  type="number"
                  min={1}
                  value={editingGroup.max}
                  onChange={(event) =>
                    updateGroup(editingGroup.id, { max: Number(event.target.value) })
                  }
                />
              </div>
            </TwoColumnFieldGroup>

            <div className="flex flex-col gap-1">
              <Label htmlFor={`list-group-path-${editingGroup.id}`}>Arreglo del payload</Label>
              <select
                id={`list-group-path-${editingGroup.id}`}
                value={editingGroup.arrayPath ?? ''}
                onChange={(event) =>
                  updateGroup(editingGroup.id, { arrayPath: event.target.value || undefined })
                }
                className={SELECT_CLASSES}
              >
                <option value="">— Sin mapear —</option>
                {groupArrayPaths.map((path) => (
                  <option key={path} value={path}>
                    {path}[]
                  </option>
                ))}
              </select>
              <p className="text-xs text-fg-muted">
                {editingGroup.arrayPath
                  ? `Cada repetición es un ítem de ${editingGroup.arrayPath}[].`
                  : 'Elige el arreglo para poder mapear los campos de adentro.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                addRowToGroup(editingGroup.id)
                setEditingGroupId(null)
                const groupRows: CanvasRow[] = getActiveRows(useFormStore.getState()).filter(
                  (row) => row.groupId === editingGroup.id,
                )
                const lastRow: CanvasRow | undefined = groupRows[groupRows.length - 1]
                if (lastRow) reveal({ kind: 'row', id: lastRow.id })
              }}
              className={ADD_FIELD_BUTTON_CLASSES}
            >
              <Plus size={16} />
              Agregar fila al grupo
            </button>

            <GroupChecksEditor group={editingGroup} />

            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  removeGroup(editingGroup.id)
                  setEditingGroupId(null)
                }}
                className={SHEET_DANGER_ACTION_CLASSES}
              >
                <Trash6 size={16} />
                Disolver el grupo (las filas se quedan)
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
