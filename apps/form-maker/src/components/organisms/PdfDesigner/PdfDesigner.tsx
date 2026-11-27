import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CloudUpload,
  DocumentDownload2,
  FolderOpen,
  Moon,
  MoreH,
  Printer,
  Sliders,
  Sun,
} from 'reicon-react'
import { useBackClose, useCanvasPan, useClickOutside, useLayoutMode } from '../../../hooks'
import { usePdfDesignAutosave } from '../../../hooks/usePdfDesignAutosave'
import { usePdfDesignerShortcuts } from '../../../hooks/usePdfDesignerShortcuts'
import { usePdfFile } from '../../../hooks/usePdfFile'
import { readPdfEntryParams, resolvePdfTaxType, taxTypeLabel } from '../../../lib/pdfDesign'
import { useFormStore } from '../../../store'
import { usePdfDesignStore } from '../../../store/pdfDesignStore'
import type { LayoutMode, PdfTaxType } from '../../../types'
import { Spinner, Tooltip } from '../../atoms'
import { BottomSheet, MenuSurface, SideDrawer } from '../../molecules'
import { PdfCanvas } from '../pdf/PdfCanvas'
import { PdfImportModal } from '../pdf/PdfImportModal'
import { PdfPaperPicker } from '../pdf/PdfPaperPicker'
import { PdfPaperSheetIcon } from '../pdf/PdfPaperSheetIcon'
import { PdfSidebar } from '../pdf/PdfSidebar'
import { PdfToolbar } from '../pdf/PdfToolbar'
import {
  BACK_BUTTON_CLASSES,
  BACK_DIVIDER_CLASSES,
  COMPACT_BACK_CLASSES,
  COMPACT_MENU_CLASSES,
  COMPACT_MENU_ITEM_CLASSES,
  COMPACT_MENU_SECTION_CLASSES,
  COMPACT_MORE_CLASSES,
  COMPACT_PAPER_OPTIONS,
  DOWNLOAD_BUTTON_CLASSES,
  HAND_CURSOR_CLASSES,
  OPEN_BUTTON_CLASSES,
  STATUS_DOT_CLASSES,
  THEME_BUTTON_CLASSES,
  UPLOAD_BUTTON_CLASSES,
} from './PdfDesigner.constants'
import { savedStatus } from './PdfDesigner.utils'

// A pantalla completa y en su propio chunk. La plantilla es la del impuesto de la URL (?impuesto=)
// o, si no, la del formulario abierto.
export function PdfDesigner() {
  const formType = useFormStore((state) => state.setupConfig.formType)
  const setPdfDesignerOpen = useFormStore((state) => state.setPdfDesignerOpen)
  const isDarkMode = useFormStore((state) => state.isDarkMode)
  const toggleDarkMode = useFormStore((state) => state.toggleDarkMode)
  const design = usePdfDesignStore((state) => state.design)
  const lastSavedAt = usePdfDesignStore((state) => state.lastSavedAt)
  const saveError = usePdfDesignStore((state) => state.saveError)
  const publishedVersion = usePdfDesignStore((state) => state.publishedVersion)
  const paperTone = usePdfDesignStore((state) => state.paperTone)
  const setPaperTone = usePdfDesignStore((state) => state.setPaperTone)
  const openDesign = usePdfDesignStore((state) => state.openDesign)
  const [isImportOpen, setImportOpen] = useState<boolean>(false)
  const [isMoreOpen, setMoreOpen] = useState<boolean>(false)
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const moreRef = useRef<HTMLDivElement | null>(null)
  const { isUploading, upload, download, print } = usePdfFile()
  const tool = usePdfDesignStore((state) => state.tool)
  const layoutMode: LayoutMode = useLayoutMode()
  const isCompactOrPhone: boolean = layoutMode !== 'desktop'

  useClickOutside(moreRef, () => setMoreOpen(false), isMoreOpen && layoutMode === 'compact')

  // En el celular, seleccionar una celda o un bloque abre la hoja de edicion a media altura, y se
  // desactiva la herramienta de seleccion multiple.
  useEffect(() => {
    if (layoutMode !== 'phone') return
    if (usePdfDesignStore.getState().tool === 'select') usePdfDesignStore.getState().setTool('move')
    return usePdfDesignStore.subscribe((state, prev) => {
      if (state.selection !== null && state.selection !== prev.selection) setSidebarOpen(true)
    })
  }, [layoutMode])

  // La URL se lee una vez al montar.
  const taxType: PdfTaxType | null = useMemo(
    () => resolvePdfTaxType(formType, readPdfEntryParams(window.location.search)),
    [formType],
  )

  const saveNow = usePdfDesignAutosave()
  usePdfDesignerShortcuts()

  // Volver y el Atras de Android hacen lo mismo: guardar antes de cerrar (la miniatura del panel lee
  // el diseno al volver).
  function closeDesigner(): void {
    saveNow()
    setPdfDesignerOpen(false)
  }

  useBackClose(true, closeDesigner)

  useEffect(() => {
    if (taxType) openDesign(taxType)
  }, [taxType, openDesign])

  const status = savedStatus(lastSavedAt, saveError)
  const isReady: boolean = design !== null && design.taxType === taxType

  // La mano desplaza el <main> (data-canvas-scroll), solo con las hojas montadas.
  useCanvasPan(isReady && tool === 'hand')

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-surface-sunken text-fg">
      {isCompactOrPhone ? (
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={closeDesigner}
              aria-label="Volver al formulario"
              className={COMPACT_BACK_CLASSES}
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-sm font-semibold text-fg-strong">Diseñar PDF</h1>
                <Tooltip content={saveError ?? status.label}>
                  <span
                    aria-label={saveError ?? status.label}
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_CLASSES[status.tone]}`}
                  />
                </Tooltip>
              </div>
              {taxType && (
                <p className="truncate text-[11px] text-fg-muted">{taxTypeLabel(taxType)}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {isReady && (
              <>
                <button
                  type="button"
                  onClick={() => setSidebarOpen((open) => !open)}
                  aria-label="Panel del PDF"
                  aria-expanded={isSidebarOpen}
                  className={COMPACT_MORE_CLASSES}
                >
                  <Sliders size={16} />
                </button>
                <button
                  type="button"
                  onClick={upload}
                  disabled={isUploading}
                  aria-busy={isUploading}
                  className={UPLOAD_BUTTON_CLASSES}
                >
                  {isUploading ? <Spinner className="size-[13px]" /> : <CloudUpload size={13} />}
                  Subir v{(publishedVersion ?? 0) + 1}
                </button>
              </>
            )}
            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                aria-label="Más opciones del diseño"
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
                className={COMPACT_MORE_CLASSES}
              >
                <MoreH size={18} />
              </button>

              {isMoreOpen && (
                <MenuSurface
                  title="Opciones del diseño"
                  onClose={() => setMoreOpen(false)}
                  popoverClassName={COMPACT_MENU_CLASSES}
                  sheetContentClassName="flex flex-col gap-1"
                  sheetSize="half"
                >
                  {isReady && (
                    <>
                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => {
                          setMoreOpen(false)
                          setImportOpen(true)
                        }}
                        className={COMPACT_MENU_ITEM_CLASSES}
                      >
                        <FolderOpen size={16} />
                        Abrir…
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false)
                          download()
                        }}
                        className={COMPACT_MENU_ITEM_CLASSES}
                      >
                        <DocumentDownload2 size={16} />
                        Descargar HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreOpen(false)
                          print()
                        }}
                        className={COMPACT_MENU_ITEM_CLASSES}
                      >
                        <Printer size={16} />
                        Imprimir
                      </button>

                      <span className={COMPACT_MENU_SECTION_CLASSES}>Papel en pantalla</span>
                      {COMPACT_PAPER_OPTIONS.map((option) => (
                        <button
                          key={option.tone}
                          type="button"
                          onClick={() => {
                            setPaperTone(option.tone)
                            setMoreOpen(false)
                          }}
                          className={COMPACT_MENU_ITEM_CLASSES}
                        >
                          <PdfPaperSheetIcon paper={option.paper} ink={option.ink} size="sm" />
                          <span className="flex-1">{option.label}</span>
                          {option.tone === paperTone && (
                            <Check size={14} weight="Filled" className="shrink-0 text-brand-fg" />
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  <span className={COMPACT_MENU_SECTION_CLASSES}>Apariencia</span>
                  <button
                    type="button"
                    onClick={() => {
                      toggleDarkMode()
                      setMoreOpen(false)
                    }}
                    className={COMPACT_MENU_ITEM_CLASSES}
                  >
                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    {isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                  </button>
                </MenuSurface>
              )}
            </div>
          </div>
        </header>
      ) : (
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6 py-2">
          <div className="flex min-w-0 items-center gap-5">
            <Tooltip content="Volver al formulario">
              <button type="button" onClick={closeDesigner} className={BACK_BUTTON_CLASSES}>
                <ArrowLeft size={14} />
                Volver
              </button>
            </Tooltip>
            <span aria-hidden className={BACK_DIVIDER_CLASSES} />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-fg-strong">Diseñar PDF</h1>
              <p className="truncate text-xs text-fg-muted">
                {taxType ? `${taxTypeLabel(taxType)} · ` : ''}Carta · 5 mm de margen del back ·{' '}
                {publishedVersion ? `Última versión subida: ${publishedVersion}` : 'Sin subir'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip content={saveError ?? status.label}>
              <span
                className={`flex items-center gap-1.5 text-[11px] ${
                  status.tone === 'error' ? 'text-danger' : 'text-fg-muted'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT_CLASSES[status.tone]}`}
                />
                {status.label}
              </span>
            </Tooltip>
            {/* Los dos controles de como se ve, juntos: el papel de las hojas y el tema de la app. */}
            {isReady && <PdfPaperPicker />}
            <Tooltip content={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}>
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                className={THEME_BUTTON_CLASSES}
              >
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </Tooltip>
            {isReady && (
              <div className="flex items-center gap-1.5">
                <Tooltip content="Abre un .html de FormMaker o una plantilla hecha a mano. Con varios, vale el de versión más alta.">
                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    disabled={isUploading}
                    className={OPEN_BUTTON_CLASSES}
                  >
                    <FolderOpen size={14} />
                    Abrir…
                  </button>
                </Tooltip>
                <Tooltip content="Descarga una copia del .html del diseño actual. No gasta versión.">
                  <button type="button" onClick={download} className={DOWNLOAD_BUTTON_CLASSES}>
                    <DocumentDownload2 size={14} />
                    Descargar HTML
                  </button>
                </Tooltip>
                <Tooltip
                  content={
                    isUploading
                      ? 'Subiendo la plantilla…'
                      : `Sube el .html a la API como versión ${(publishedVersion ?? 0) + 1}`
                  }
                >
                  <button
                    type="button"
                    onClick={upload}
                    disabled={isUploading}
                    aria-busy={isUploading}
                    className={UPLOAD_BUTTON_CLASSES}
                  >
                    {isUploading ? <Spinner className="size-[13px]" /> : <CloudUpload size={13} />}
                    Subir v{(publishedVersion ?? 0) + 1}
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </header>
      )}

      {isImportOpen && <PdfImportModal onClose={() => setImportOpen(false)} />}

      {!taxType && (
        <p className="mx-auto mt-16 max-w-md px-6 text-center text-sm text-fg-muted">
          Este formulario no tiene impuesto definido, así que no hay plantilla que abrir. Cada
          impuesto tiene la suya.
        </p>
      )}

      {isReady && (
        <div className="flex min-h-0 flex-1">
          {layoutMode === 'desktop' && (
            <aside className="w-80 shrink-0 overflow-y-auto border-r border-border bg-surface">
              <PdfSidebar />
            </aside>
          )}
          {/* La barra cuelga de este contenedor y no del <main> que hace scroll: queda quieta
              sobre las hojas. */}
          <div className="relative flex min-w-0 flex-1 flex-col">
            <main
              data-canvas-scroll
              className={`min-h-0 flex-1 overflow-auto touch-pan-x touch-pan-y ${tool === 'hand' ? HAND_CURSOR_CLASSES : ''}`}
            >
              <PdfCanvas />
            </main>
            <PdfToolbar />
          </div>
        </div>
      )}

      {isReady && layoutMode === 'compact' && isSidebarOpen && (
        <SideDrawer label="Panel del PDF" side="left" onClose={() => setSidebarOpen(false)}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PdfSidebar />
          </div>
        </SideDrawer>
      )}

      {isReady && layoutMode === 'phone' && isSidebarOpen && (
        <BottomSheet title="Panel del PDF" size="half" onClose={() => setSidebarOpen(false)}>
          <PdfSidebar />
        </BottomSheet>
      )}
    </div>
  )
}
