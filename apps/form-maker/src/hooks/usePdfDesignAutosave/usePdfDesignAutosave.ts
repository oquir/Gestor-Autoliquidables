import { useCallback, useEffect, useRef } from 'react'
import { usePdfDesignStore } from '../../store/pdfDesignStore'
import { PDF_AUTOSAVE_DELAY_MS } from './usePdfDesignAutosave.constants'
import type { PdfAutosave } from './usePdfDesignAutosave.types'
import { startPdfAutosave } from './usePdfDesignAutosave.utils'

// Autoguardado del diseno del PDF mientras el disenador esta montado, poco despues de cada cambio,
// en la llave de su impuesto. Al desmontar guarda lo pendiente. La logica vive en startPdfAutosave.
// Devuelve el guardado inmediato, para Volver: el panel que vuelve lee el diseno en su render, antes
// de que corra este desmontaje, y sin guardar antes mostraba la miniatura vieja (auditoria B8).
export function usePdfDesignAutosave(): () => void {
  const autosave = useRef<PdfAutosave | null>(null)

  useEffect(() => {
    const started: PdfAutosave = startPdfAutosave(usePdfDesignStore, PDF_AUTOSAVE_DELAY_MS)
    autosave.current = started

    return () => {
      autosave.current = null
      started.stop()
    }
  }, [])

  return useCallback((): void => autosave.current?.flush(), [])
}
