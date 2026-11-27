import { useEffect, useRef } from 'react'
import { Refresh } from 'reicon-react'
import { useLayoutMode } from '../../../../hooks'
import { usePreviewNavigation } from '../../../../hooks/usePreviewNavigation'
import { PreviewStep } from '../PreviewStep'
import {
  HIDDEN_ON_PHONE_CLASSES,
  INTRO_FOOTER_CLASSES,
  INTRO_OVERLAY_CLASSES,
  INTRO_PANEL_CLASSES,
  NAV_BUTTON_CLASSES,
  NAV_FOOTER_CLASSES,
  PRIMARY_BUTTON_CLASSES,
  RESTART_BUTTON_CLASSES,
  SUBMITTED_CLASSES,
} from './PreviewForm.constants'
import type { PreviewFormProps } from './PreviewForm.types'
import { handleEnterKey, labelEnterKeys } from './PreviewForm.utils'
import {
  ENTER_FADE_CLASSES,
  ENTER_MODAL_CLASSES,
  ENTER_POP_CLASSES,
  ENTER_RISE_CLASSES,
  ENTER_STEP_BACK_CLASSES,
  ENTER_STEP_FORWARD_CLASSES,
  PREVIEW_FORM_CONTAINER_CLASSES,
} from '../../../../constants'

export function PreviewForm({ preview }: PreviewFormProps) {
  const navigation = usePreviewNavigation(preview)
  const isPhone: boolean = useLayoutMode() === 'phone'
  const cardRef = useRef<HTMLDivElement | null>(null)
  const stepScopeRef = useRef<HTMLDivElement | null>(null)
  const introScopeRef = useRef<HTMLDivElement | null>(null)
  // Lo que se ve: un paso del modal de entrada o uno del formulario.
  const viewKey: string | undefined = navigation.showIntro
    ? `intro:${navigation.introStep?.stepId}`
    : navigation.step?.stepId
  const shownView = useRef<string | undefined>(viewKey)
  const coveredOnPhone: string = navigation.showIntro ? HIDDEN_ON_PHONE_CLASSES : ''

  // Con el pie pegado abajo se avanza desde el final del paso: el siguiente tiene que empezar arriba.
  useEffect(() => {
    if (shownView.current === viewKey) return
    shownView.current = viewKey
    if (isPhone) cardRef.current?.scrollIntoView({ block: 'start' })
  }, [viewKey, isPhone])

  // Sin dependencias a proposito: un campo que aparece o se esconde cambia cual es el ultimo.
  useEffect(() => {
    labelEnterKeys(stepScopeRef.current)
    labelEnterKeys(introScopeRef.current)
  })

  return (
    <div
      ref={cardRef}
      className={`${PREVIEW_FORM_CONTAINER_CLASSES} relative min-w-0 scroll-mt-4 rounded-lg border border-border bg-surface p-6`}
    >
      {navigation.step ? (
        <div
          key={navigation.step.stepId}
          ref={stepScopeRef}
          onKeyDown={handleEnterKey}
          className={`${
            navigation.direction === 'back' ? ENTER_STEP_BACK_CLASSES : ENTER_STEP_FORWARD_CLASSES
          } ${coveredOnPhone}`}
        >
          <PreviewStep step={navigation.step} preview={preview} />
        </div>
      ) : (
        <p className={coveredOnPhone}>Sin pasos.</p>
      )}

      <footer className={`${NAV_FOOTER_CLASSES} ${coveredOnPhone}`}>
        {navigation.submitted && (
          <span
            className={`${SUBMITTED_CLASSES} w-full text-center sm:hidden ${ENTER_POP_CLASSES}`}
          >
            Formulario válido · el payload está listo
          </span>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={navigation.isFirstStep}
            onClick={navigation.goBack}
            className={NAV_BUTTON_CLASSES}
          >
            Anterior
          </button>
          <span className="text-[11px] text-fg-subtle">
            Paso {navigation.stepNumber} de {navigation.stepCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {navigation.submitted && (
            <span className={`${SUBMITTED_CLASSES} max-sm:hidden ${ENTER_POP_CLASSES}`}>
              Formulario válido · el payload está listo
            </span>
          )}
          <button type="button" onClick={navigation.restart} className={RESTART_BUTTON_CLASSES}>
            <Refresh size={16} aria-hidden className="sm:hidden" />
            <span className="max-sm:sr-only">Reiniciar</span>
          </button>
          <button type="button" onClick={navigation.advance} className={PRIMARY_BUTTON_CLASSES}>
            {navigation.isLastStep ? 'Enviar' : 'Siguiente'}
          </button>
        </div>
      </footer>

      {navigation.showIntro && (
        <div className={`${INTRO_OVERLAY_CLASSES} ${ENTER_FADE_CLASSES}`}>
          <div
            ref={introScopeRef}
            onKeyDown={handleEnterKey}
            className={`${INTRO_PANEL_CLASSES} ${ENTER_MODAL_CLASSES}`}
          >
            {navigation.introStep && (
              <div key={navigation.introStep.stepId} className={ENTER_RISE_CLASSES}>
                <PreviewStep step={navigation.introStep} preview={preview} />
              </div>
            )}
            <div className={INTRO_FOOTER_CLASSES}>
              <span className="text-[11px] text-fg-subtle">
                Modal de entrada · {navigation.introNumber} de {navigation.introCount}
              </span>
              <button
                type="button"
                onClick={navigation.advanceIntro}
                className={PRIMARY_BUTTON_CLASSES}
              >
                {navigation.isLastIntroStep ? 'Ir al formulario' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
