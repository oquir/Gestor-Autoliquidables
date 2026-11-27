import type { ComponentType } from 'react'
import { HelpCircle, Link, LinkOff } from 'reicon-react'
import type { FieldTypeCategory, IconProps } from '../../../types'
import type { FieldDestination } from './CanvasList.types'

export const LIST_CONTAINER_CLASSES: string =
  'mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 py-4'

export const INTRO_BANNER_CLASSES: string =
  'flex items-center gap-2 rounded-lg border border-brand-border bg-brand-soft/40 px-3 py-2 text-xs font-semibold text-brand-text'

export const EMPTY_STATE_CLASSES: string =
  'rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted'

export const GROUP_SECTION_CLASSES: string =
  'flex flex-col gap-2.5 rounded-xl border border-dashed border-border bg-surface-subtle/60 p-2.5'

export const GROUP_HEADER_CLASSES: string =
  'flex items-center justify-between gap-2 px-1 text-xs text-fg-muted'

export const ROW_CARD_CLASSES: string =
  'flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-xs'

export const ROW_HEADER_CLASSES: string = 'flex items-center justify-between gap-2'

export const ROW_TITLE_CLASSES: string = 'text-xs font-semibold text-fg-muted'

export const ROW_MORE_BUTTON_CLASSES: string =
  'flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg-strong'

export const FIELD_BUTTON_CLASSES: string =
  'flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors'

export const FIELD_DEFAULT_CLASSES: string = 'border-border bg-surface hover:bg-surface-hover'

export const FIELD_INTERNAL_CLASSES: string =
  'border-dashed border-border bg-surface hover:bg-surface-hover'

export const FIELD_SELECTED_CLASSES: string = 'border-brand bg-brand-soft/30 ring-1 ring-brand'

export const FIELD_META_CLASSES: string = 'text-[11px] tabular-nums text-fg-subtle'

export const SHEET_ACTION_CLASSES: string =
  'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40'

export const SHEET_DANGER_ACTION_CLASSES: string =
  'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft/40'

export const MOVE_CAPTION_CLASSES: string =
  'px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle'

export const MOVE_ITEM_CLASSES: string =
  'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-hover'

export const MOVE_NUMBER_CLASSES: string =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-surface-subtle text-xs font-semibold text-fg-muted'

export const CATEGORY_ORDER: FieldTypeCategory[] = ['basico', 'complejo', 'contenido']

export const CATEGORY_HEADINGS: Record<FieldTypeCategory, string> = {
  basico: 'Campos básicos',
  complejo: 'Campos con opciones',
  contenido: 'Contenido',
}

export const ADD_FIELD_BUTTON_CLASSES: string =
  'flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-fg transition-colors hover:border-brand-border hover:bg-surface-hover'

export const DESTINATION_ICONS: Partial<Record<FieldDestination, ComponentType<IconProps>>> = {
  sent: Link,
  internal: LinkOff,
  pending: HelpCircle,
}

export const DESTINATION_COLOR_CLASSES: Partial<Record<FieldDestination, string>> = {
  sent: 'text-brand',
  internal: 'text-fg-subtle',
  pending: 'text-fg-subtle',
}

export const DESTINATION_TITLES: Record<Exclude<FieldDestination, 'none'>, string> = {
  sent: 'Se envía a la API',
  internal: 'No se envía a la API: es de uso interno del formulario',
  pending: 'Falta decidir si se envía a la API (pestaña Mapeo API)',
}
