import { INDUSTRIA_COMERCIO_INTRO_STEPS } from '../../src/constants/baseTemplate'
import { buildFormExport } from '../../src/lib/exportForm/exportForm'
import {
  buildRuntimeModel,
  createInitialState,
  resolveRuntime,
} from '../../src/lib/formRuntime/formRuntime'
import { aUtc } from '../../src/lib/maxDates/maxDates'
import { maxDatesEnUso } from '../../src/lib/maxDatesBank/maxDatesBank'
import { buildPayload } from '../../src/lib/runtimePayload/runtimePayload'
import { validateRuntime } from '../../src/lib/runtimeValidation/runtimeValidation'
import { valoresEnUso } from '../../src/lib/valoresBank/valoresBank'
import { buildInitialFormSteps, buildInitialIntroSteps } from '../../src/store/formStore.utils'
import type { FormExport } from '../../src/types/exportForm'
import type {
  PreviewState,
  RuntimeContext,
  RuntimeModel,
  RuntimeSnapshot,
  RuntimeValues,
  ValidationResult,
} from '../../src/types/formRuntime'
import type { FormStep } from '../../src/types/formStructure'
import type { SetupConfig } from '../../src/types/setup'
import { exportSteps, type ExportOptions } from './canvasFixtures'

// Ayudas de las pruebas del runtime. Solo las importan los .test.ts: el build no las empaqueta.

// El ICA como lo deja el asistente: ocho pasos y los dos del modal de entrada.
export function buildIcaExport(): FormExport {
  const setupConfig: SetupConfig = {
    isComplete: true,
    formType: 'industria_comercio',
    hasIntroModal: true,
    introModalSteps: INDUSTRIA_COMERCIO_INTRO_STEPS,
  }

  return buildFormExport(
    buildInitialFormSteps('industria_comercio'),
    setupConfig,
    buildInitialIntroSteps('industria_comercio', INDUSTRIA_COMERCIO_INTRO_STEPS),
    '',
  )
}

export function buildIcaModel(): RuntimeModel {
  return buildRuntimeModel(buildIcaExport())
}

// El contexto como lo arma useFormPreview con los bancos de fabrica, pero con hoy fijo: la tabla
// de vencimientos sale del ano de hoy, no del reloj.
export function defaultContext(model: RuntimeModel, hoy: string): RuntimeContext {
  const ms: number | null = aUtc(hoy)
  if (ms === null) throw new Error(`Fecha de prueba inválida: ${hoy}`)

  const anio: number = new Date(ms).getUTCFullYear()

  return {
    reglas: maxDatesEnUso({ source: 'default', custom: null }, anio)[model.declaracion],
    hoy,
    valores: valoresEnUso({ source: 'default', custom: null }),
  }
}

export interface PipelineResult {
  exported: FormExport
  model: RuntimeModel
  snapshot: RuntimeSnapshot
  validation: ValidationResult
  payload: Record<string, unknown>
}

// El camino entero del consumidor: export, modelo, calculo, validacion y payload.
export function runPipeline(
  steps: FormStep[],
  values: RuntimeValues,
  options: ExportOptions & {
    groups?: Record<string, RuntimeValues[]>
    hoy?: string
  } = {},
): PipelineResult {
  const exported: FormExport = exportSteps(steps, options)
  const model: RuntimeModel = buildRuntimeModel(exported)
  const initial: PreviewState = createInitialState(model)
  const state: PreviewState = { values, groups: { ...initial.groups, ...options.groups } }
  const context: RuntimeContext = defaultContext(model, options.hoy ?? '2026/06/10')
  const snapshot: RuntimeSnapshot = resolveRuntime(model, state, context)

  return {
    exported,
    model,
    snapshot,
    validation: validateRuntime(model, snapshot, context),
    payload: buildPayload(model, snapshot),
  }
}

// Los ids son uuid y cambian en cada corrida: los grupos se buscan por nombre.
export function groupIdByName(model: RuntimeModel, name: string): string {
  for (const [groupId, group] of model.groupsById) {
    if (group.name === name) return groupId
  }

  throw new Error(`No hay grupo "${name}" en el modelo`)
}
