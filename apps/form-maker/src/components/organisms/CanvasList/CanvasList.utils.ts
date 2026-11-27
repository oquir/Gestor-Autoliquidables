import { isPresentationalField } from '../../../lib/fieldKind/fieldKind'
import { getFreeRuns } from '../../../lib/rowLayout/rowLayout'
import type { CanvasField } from '../../../types/field'
import type { CanvasRow, FormStep, IntroModalStep } from '../../../types/formStructure'
import type { CanvasTarget } from '../../../types/placement'
import { DESTINATION_TITLES } from './CanvasList.constants'
import type { FieldDestination, MoveOption, MoveSection } from './CanvasList.types'

export function getFieldDestination(field: CanvasField): FieldDestination {
  if (isPresentationalField(field.type)) return 'none'
  if (!field.apiBinding) return 'pending'

  return field.apiBinding.kind === 'mapped' ? 'sent' : 'internal'
}

export function getDestinationTitle(field: CanvasField, destination: FieldDestination): string {
  if (destination === 'none') return ''
  if (destination === 'sent' && field.apiBinding?.kind === 'mapped') {
    return `${DESTINATION_TITLES.sent} en ${field.apiBinding.path}`
  }

  return DESTINATION_TITLES[destination]
}

export function hasRowFreeSpace(row: CanvasRow): boolean {
  return getFreeRuns(row.fields, row.columns).length > 0
}

export function buildMoveSections(
  formSteps: FormStep[],
  introSteps: IntroModalStep[],
  activeCanvas: CanvasTarget,
): MoveSection[] {
  const isSameTarget = (candidate: CanvasTarget): boolean =>
    candidate.type === activeCanvas.type && candidate.stepId === activeCanvas.stepId

  const introOptions: MoveOption[] = introSteps
    .map((step, index) => ({
      target: { type: 'introStep', stepId: step.stepId } as CanvasTarget,
      number: index + 1,
      title: step.title.trim() || `Modal ${index + 1}`,
    }))
    .filter((option) => !isSameTarget(option.target))

  const formOptions: MoveOption[] = formSteps
    .map((step, index) => ({
      target: { type: 'formStep', stepId: step.stepId } as CanvasTarget,
      number: index + 1,
      title: step.title.trim() || `Paso ${index + 1}`,
    }))
    .filter((option) => !isSameTarget(option.target))

  const sections: MoveSection[] = []
  if (introOptions.length > 0) {
    sections.push({ key: 'intro', caption: 'Modal de entrada', options: introOptions })
  }
  if (formOptions.length > 0) {
    sections.push({
      key: 'form',
      caption: introOptions.length > 0 ? 'Formulario' : undefined,
      options: formOptions,
    })
  }

  return sections
}
