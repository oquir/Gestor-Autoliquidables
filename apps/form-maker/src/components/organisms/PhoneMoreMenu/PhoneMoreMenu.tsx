import { useState } from 'react'
import { FolderOpen, Moon, MoreH, Sun } from 'reicon-react'
import { useFormStore } from '../../../store/formStore'
import { BottomSheet } from '../../molecules/BottomSheet/BottomSheet'
import { FormSummary } from '../../molecules/FormSummary/FormSummary'
import { PerformanceModeToggle } from '../../molecules/PerformanceModeToggle/PerformanceModeToggle'
import { ExportButton } from '../ExportButton/ExportButton'
import { PdfDesignerButton } from '../PdfDesignerButton/PdfDesignerButton'
import { PdfPreviewBlock } from '../PdfPreviewBlock/PdfPreviewBlock'
import { ProjectImportModal } from '../ProjectImportModal/ProjectImportModal'
import { SaveButton } from '../SaveButton/SaveButton'
import { SimulatorButton } from '../SimulatorButton/SimulatorButton'
import {
  ACTIONS_GRID_CLASSES,
  OPEN_BUTTON_CLASSES,
  PDF_PREVIEW_FRAME_CLASSES,
  PREFERENCE_ROW_CLASSES,
  SECTION_TITLE_CLASSES,
  TRIGGER_CLASSES,
} from './PhoneMoreMenu.constants'

export function PhoneMoreMenu() {
  const isDarkMode = useFormStore((state) => state.isDarkMode)
  const toggleDarkMode = useFormStore((state) => state.toggleDarkMode)
  const [isOpen, setOpen] = useState<boolean>(false)
  const [isImportOpen, setImportOpen] = useState<boolean>(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Más acciones"
        aria-haspopup="dialog"
        className={TRIGGER_CLASSES}
      >
        <MoreH size={18} />
      </button>

      {isOpen && (
        <BottomSheet title="Proyecto" size="full" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-5">
            <div className={ACTIONS_GRID_CLASSES}>
              <SaveButton bordered />
              <SimulatorButton />
              <PdfDesignerButton />
              <ExportButton />
              {/* Cierra la hoja primero: abierta deja inerte lo de afuera, y el modal va afuera. */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setImportOpen(true)
                }}
                className={OPEN_BUTTON_CLASSES}
              >
                <FolderOpen size={13} />
                Abrir…
              </button>
            </div>

            <section className="flex flex-col">
              <h3 className={SECTION_TITLE_CLASSES}>Preferencias</h3>
              <div className={PREFERENCE_ROW_CLASSES}>
                Modo oscuro
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  aria-pressed={isDarkMode}
                  aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                  className={TRIGGER_CLASSES}
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
              <div className={PREFERENCE_ROW_CLASSES}>
                Bajo rendimiento
                <PerformanceModeToggle />
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className={SECTION_TITLE_CLASSES}>Formulario</h3>
              <FormSummary />
            </section>

            <div className={PDF_PREVIEW_FRAME_CLASSES}>
              <PdfPreviewBlock />
            </div>
          </div>
        </BottomSheet>
      )}

      {isImportOpen && <ProjectImportModal onClose={() => setImportOpen(false)} />}
    </>
  )
}
