import { useState } from 'react'
import { AngleDown2, AngleLeft2, AngleRight2 } from 'reicon-react'
import { adjacentStep, describeActiveStep, orderedSteps } from '../../../lib'
import { useFormStore } from '../../../store/formStore'
import type { ActiveStepDescription, CanvasTarget } from '../../../types'
import { BottomSheet } from '../../molecules/BottomSheet/BottomSheet'
import { SaveStatus } from '../../molecules/SaveStatus/SaveStatus'
import { CanvasTabs } from '../CanvasTabs/CanvasTabs'
import { PhoneMoreMenu } from '../PhoneMoreMenu/PhoneMoreMenu'
import { StepTitleEditor } from '../StepTitleEditor/StepTitleEditor'
import { UploadButton } from '../UploadButton/UploadButton'
import {
  ARROW_BUTTON_CLASSES,
  BAR_CLASSES,
  STEP_BUTTON_CLASSES,
  STEP_NUMBER_CLASSES,
  STEP_TITLE_CLASSES,
} from './PhoneTopBar.constants'

export function PhoneTopBar() {
  const formSteps = useFormStore((state) => state.formSteps)
  const introSteps = useFormStore((state) => state.introModal.steps)
  const activeCanvas = useFormStore((state) => state.activeCanvas)
  const setActiveCanvas = useFormStore((state) => state.setActiveCanvas)
  const [isStepsOpen, setStepsOpen] = useState<boolean>(false)

  // El orden del contribuyente, el mismo de Ctrl + flechas: primero el modal.
  const steps: CanvasTarget[] = orderedSteps(formSteps, introSteps)
  const previous: CanvasTarget | null = adjacentStep(steps, activeCanvas, -1)
  const next: CanvasTarget | null = adjacentStep(steps, activeCanvas, 1)
  const step: ActiveStepDescription | null = describeActiveStep(formSteps, introSteps, activeCanvas)

  return (
    <>
      <header className={BAR_CLASSES}>
        <button
          type="button"
          onClick={() => previous && setActiveCanvas(previous)}
          disabled={!previous}
          aria-label="Paso anterior"
          className={ARROW_BUTTON_CLASSES}
        >
          <AngleLeft2 size={18} />
        </button>

        <button
          type="button"
          onClick={() => setStepsOpen(true)}
          aria-haspopup="dialog"
          className={STEP_BUTTON_CLASSES}
        >
          {step && (
            <span className={STEP_NUMBER_CLASSES}>
              {step.isIntro ? 'Modal' : 'Paso'} {step.number}/{step.total}
            </span>
          )}
          <span className={STEP_TITLE_CLASSES}>{step?.title || 'Sin título'}</span>
          <AngleDown2 size={14} className="shrink-0 text-fg-muted" />
        </button>

        <button
          type="button"
          onClick={() => next && setActiveCanvas(next)}
          disabled={!next}
          aria-label="Paso siguiente"
          className={ARROW_BUTTON_CLASSES}
        >
          <AngleRight2 size={18} />
        </button>

        <SaveStatus compact />
        <UploadButton />
        <PhoneMoreMenu />
      </header>

      {isStepsOpen && (
        <BottomSheet title="Pasos" size="full" onClose={() => setStepsOpen(false)}>
          <div className="flex flex-col gap-4">
            <CanvasTabs />
            <StepTitleEditor />
          </div>
        </BottomSheet>
      )}
    </>
  )
}
