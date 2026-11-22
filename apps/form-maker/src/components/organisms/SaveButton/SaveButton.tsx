import { Check, Floppy2 } from 'reicon-react'
import { useSaveButton } from '../../../hooks/useSaveButton/useSaveButton'
import {
  SAVE_BUTTON_BORDERED_STATE_CLASSES,
  SAVE_BUTTON_STATE_CLASSES,
} from './SaveButton.constants'
import type { SaveButtonProps } from './SaveButton.types'
import { Tooltip } from '../../atoms'

export function SaveButton({ iconOnly = false, bordered = false }: SaveButtonProps) {
  const { lastSavedAt, justSaved, handleSave } = useSaveButton()
  const stateClasses: Record<'saved' | 'idle', string> = bordered
    ? SAVE_BUTTON_BORDERED_STATE_CLASSES
    : SAVE_BUTTON_STATE_CLASSES

  // La hora va en el title (y hace de aria-label): una segunda linea moveria los botones vecinos.
  const savedLabel: string = lastSavedAt
    ? `Guardar · guardado ${new Date(lastSavedAt).toLocaleTimeString()}`
    : 'Guardar · todavía sin guardar'

  return (
    <Tooltip content={savedLabel}>
      <button
        type="button"
        onClick={handleSave}
        aria-label={iconOnly ? savedLabel : undefined}
        className={justSaved ? stateClasses.saved : stateClasses.idle}
      >
        {justSaved ? <Check size={13} weight="Filled" /> : <Floppy2 size={13} />}
        {!iconOnly && (justSaved ? 'Guardado' : 'Guardar')}
      </button>
    </Tooltip>
  )
}
