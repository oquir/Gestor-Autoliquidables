import { toast } from 'sonner'
import {
  CLIPBOARD_TOAST_DESCRIPTION,
  CLIPBOARD_TOAST_ID,
  CLIPBOARD_TOAST_TITLE,
} from './clipboard.constants'

// Copia o avisa, para los botones de copiar: navigator.clipboard no existe fuera de un contexto
// seguro y writeText rechaza sin permiso o sin foco. Antes el rechazo quedaba sin manejar y el boton
// no decia nada. Devuelve si copio: el boton marca "Copiado" solo entonces. Toca la UI (sonner).
export async function copyTextOrWarn(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    toast.error(CLIPBOARD_TOAST_TITLE, {
      id: CLIPBOARD_TOAST_ID,
      description: CLIPBOARD_TOAST_DESCRIPTION,
    })
    return false
  }
}
