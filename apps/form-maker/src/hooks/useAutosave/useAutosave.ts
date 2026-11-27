import { useEffect } from 'react'
import { TOUCH_POINTER_QUERY } from '../../constants'
import { saveDraftOrWarn } from '../../lib'
import { useFormStore } from '../../store'
import { usePageHide } from '../usePageHide'
import { AUTOSAVE_INTERVAL_MS } from './useAutosave.constants'

// Guarda el borrador cada cierto tiempo y, ademas, cada vez que la pagina se oculta o se cierra:
// el celular mata la pestana de fondo sin avisar y se perdian hasta 3 minutos (B9 de
// docs/Plan-Movil.md; en el escritorio tambien ayuda). Vive en App para seguir corriendo con el
// simulador abierto.

function saveDraftNow(): void {
  // getState y no selector: suscribirse reiniciaria el intervalo en cada tecla.
  const { formSteps, introModal, formScript, setupConfig, markSaved } = useFormStore.getState()

  // Antes de terminar el asistente no hay nada que valga la pena guardar.
  if (!setupConfig.isComplete) return

  saveDraftOrWarn({ formSteps, introModal, formScript, setupConfig }, markSaved)
}

export function useAutosave() {
  useEffect(() => {
    const intervalId = setInterval(saveDraftNow, AUTOSAVE_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [])

  usePageHide(saveDraftNow)

  // Pide una vez que el navegador no borre el localStorage cuando falta espacio. Solo en tactil:
  // Firefox de escritorio lo pregunta con un cartel, y el plan deja el escritorio igual. Chrome
  // decide solo, sin preguntar. Si lo niega no pasa nada: se sigue guardando igual.
  useEffect(() => {
    if (!('storage' in navigator) || !window.matchMedia(TOUCH_POINTER_QUERY).matches) return

    navigator.storage
      .persisted()
      .then((isPersisted: boolean) => (isPersisted ? isPersisted : navigator.storage.persist()))
      .catch(() => undefined)
  }, [])
}
