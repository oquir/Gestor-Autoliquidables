import { toast } from 'sonner'
import type { DraftPayload, DraftSaveResult } from '../../types'
import { saveDraft } from '../persistence/persistence'
import { DRAFT_SAVE_TOAST_ID, DRAFT_SAVE_TOAST_TITLE } from './draftSave.constants'

// Los cuatro sitios que guardan el borrador (autoguardado, Guardar, Ctrl+S y abrir un archivo)
// cuentan el resultado igual: "Guardado" solo si se guardo; si no, un toast de error, que se repite
// en cada intento fallido. Toca la UI (sonner); el guardado en si es lib/persistence.
export function saveDraftOrWarn(
  payload: Omit<DraftPayload, 'savedAt' | 'schemaVersion'>,
  markSaved: () => void,
): void {
  const result: DraftSaveResult = saveDraft(payload)

  if (result.ok) {
    // Un aviso de un intento anterior ya no es cierto.
    toast.dismiss(DRAFT_SAVE_TOAST_ID)
    markSaved()
    return
  }

  toast.error(DRAFT_SAVE_TOAST_TITLE, { id: DRAFT_SAVE_TOAST_ID, description: result.error })
}
