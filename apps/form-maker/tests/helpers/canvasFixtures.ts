import { buildFormExport } from '../../src/lib/exportForm/exportForm'
import { buildRuntimeModel } from '../../src/lib/formRuntime/formRuntime'
import type { CanvasField } from '../../src/types/field'
import type { FormExport } from '../../src/types/exportForm'
import type {
  CanvasRow,
  FormStep,
  IntroModalStep,
  RepeatableGroup,
} from '../../src/types/formStructure'
import type { RuntimeModel } from '../../src/types/formRuntime'
import type { FormType, SetupConfig } from '../../src/types/setup'

// Formularios pequenos para las pruebas, sin pasar por el store. Los ids salen del nombre
// (id-<nombre>) para poder escribir condiciones a mano; en la app son uuid.

export function fieldId(name: string): string {
  return `id-${name}`
}

export function makeField(
  type: string,
  name: string,
  overrides: Partial<CanvasField> = {},
): CanvasField {
  return {
    id: fieldId(name),
    name,
    type,
    label: name,
    colStart: 1,
    colSpan: 4,
    validations: {},
    styles: {},
    logic: {},
    ...overrides,
  }
}

// Los campos se acomodan uno al lado del otro desde la columna 1, como las lineas del grid de CSS.
export function makeRow(fields: CanvasField[], groupId?: string): CanvasRow {
  let colStart: number = 1
  const placed: CanvasField[] = fields.map((field) => {
    const next: CanvasField = { ...field, colStart }
    colStart += field.colSpan
    return next
  })

  return {
    id: `fila-${fields.map((field) => field.name).join('-')}`,
    columns: 16,
    fields: placed,
    ...(groupId ? { groupId } : {}),
  }
}

// Un campo por fila: lo comun en las pruebas.
export function makeStep(
  title: string,
  rows: (CanvasRow | CanvasField)[],
  groups?: RepeatableGroup[],
): FormStep {
  return {
    stepId: `paso-${title}`,
    title,
    rows: rows.map((row) => ('fields' in row ? row : makeRow([row]))),
    ...(groups ? { groups } : {}),
  }
}

export function makeGroup(name: string, overrides: Partial<RepeatableGroup> = {}): RepeatableGroup {
  return { id: `grupo-${name}`, name, title: name, min: 1, max: 5, ...overrides }
}

export interface ExportOptions {
  formType?: FormType
  introSteps?: IntroModalStep[]
  formScript?: string
}

export function exportSteps(steps: FormStep[], options: ExportOptions = {}): FormExport {
  const introSteps: IntroModalStep[] = options.introSteps ?? []
  const setupConfig: SetupConfig = {
    isComplete: true,
    formType: options.formType ?? 'industria_comercio',
    hasIntroModal: introSteps.length > 0,
    introModalSteps: introSteps.length,
  }

  return buildFormExport(steps, setupConfig, introSteps, options.formScript ?? '')
}

export function modelOf(steps: FormStep[], options: ExportOptions = {}): RuntimeModel {
  return buildRuntimeModel(exportSteps(steps, options))
}
