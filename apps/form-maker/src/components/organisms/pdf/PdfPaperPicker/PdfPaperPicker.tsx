import { useRef, useState } from 'react'
import { AngleDown2, Check } from 'reicon-react'
import { useClickOutside } from '../../../../hooks'
import { usePdfDesignStore } from '../../../../store/pdfDesignStore'
import { Tooltip } from '../../../atoms'
import { PdfPaperSheetIcon } from '../PdfPaperSheetIcon'
import {
  ITEM_CLASSES,
  MENU_CLASSES,
  MENU_NOTE_CLASSES,
  PAPER_OPTIONS,
  TRIGGER_CLASSES,
} from './PdfPaperPicker.constants'

// Solo cambia como se ve la hoja en el disenador: el .html y la impresion no lo saben.
export function PdfPaperPicker() {
  const paperTone = usePdfDesignStore((state) => state.paperTone)
  const setPaperTone = usePdfDesignStore((state) => state.setPaperTone)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useClickOutside(containerRef, () => setIsOpen(false), isOpen)

  const current: (typeof PAPER_OPTIONS)[number] =
    PAPER_OPTIONS.find((option) => option.tone === paperTone) ?? PAPER_OPTIONS[0]

  return (
    <div ref={containerRef} className="relative">
      <Tooltip content="Color del papel en pantalla" disabled={isOpen}>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={TRIGGER_CLASSES}
        >
          <PdfPaperSheetIcon paper={current.paper} ink={current.ink} size="sm" />
          Papel: {current.label}
          <AngleDown2 size={12} />
        </button>
      </Tooltip>

      {isOpen && (
        <div role="menu" aria-label="Papel de la vista" className={MENU_CLASSES}>
          {PAPER_OPTIONS.map((option) => (
            <button
              key={option.tone}
              type="button"
              role="menuitemradio"
              aria-checked={option.tone === paperTone}
              onClick={() => {
                setPaperTone(option.tone)
                setIsOpen(false)
              }}
              className={ITEM_CLASSES}
            >
              <PdfPaperSheetIcon paper={option.paper} ink={option.ink} size="md" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs font-medium text-fg-strong">{option.label}</span>
                <span className="text-[11px] text-fg-muted">{option.hint}</span>
              </span>
              {option.tone === paperTone && (
                <Check size={12} weight="Filled" className="shrink-0 text-brand-fg" />
              )}
            </button>
          ))}
          <p className={MENU_NOTE_CLASSES}>Solo en pantalla: el PDF siempre sale en blanco.</p>
        </div>
      )}
    </div>
  )
}
