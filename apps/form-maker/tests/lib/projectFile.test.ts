import { describe, expect, it } from 'vitest'
import { INDUSTRIA_COMERCIO_INTRO_STEPS } from '../../src/constants/baseTemplate'
import { buildInitialFormSteps, buildInitialIntroSteps } from '../../src/store/formStore.utils'
import type { FormExportFile, ProjectFileLoad, SetupConfig } from '../../src/types'
import { buildFormExportFile } from '../../src/lib/exportForm/exportForm'
import { DRAFT_SCHEMA_VERSION } from '../../src/lib/persistence/persistence.constants'
import { readProjectFile, summarizeProjectFile } from '../../src/lib/projectFile/projectFile'
import {
  DAMAGED_MESSAGE,
  LEGACY_EXPORT_MESSAGE,
  NEWER_VERSION_MESSAGE,
  NOT_EXPORT_MESSAGE,
  NOT_JSON_MESSAGE,
} from '../../src/lib/projectFile/projectFile.constants'

function icaFile(setup: Partial<SetupConfig> = {}): FormExportFile {
  return buildFormExportFile(
    buildInitialFormSteps('industria_comercio'),
    {
      isComplete: true,
      formType: 'industria_comercio',
      hasIntroModal: true,
      introModalSteps: INDUSTRIA_COMERCIO_INTRO_STEPS,
      ...setup,
    },
    buildInitialIntroSteps('industria_comercio', INDUSTRIA_COMERCIO_INTRO_STEPS),
    'const TASA = 0.05;',
  )
}

describe('readProjectFile', () => {
  it('un export reabre el proyecto tal como se guardó', () => {
    const file: FormExportFile = icaFile()
    const loaded: ProjectFileLoad = readProjectFile(JSON.stringify(file))

    expect(loaded.status).toBe('ok')
    if (loaded.status !== 'ok') return
    expect(loaded.draft.formSteps).toEqual(file.builderDraft.formSteps)
    expect(loaded.draft.introModal).toEqual(file.builderDraft.introModal)
    expect(loaded.draft.formScript).toBe('const TASA = 0.05;')
    expect(loaded.renamed).toEqual([])
  })

  it('siempre abre con el asistente terminado', () => {
    const loaded: ProjectFileLoad = readProjectFile(JSON.stringify(icaFile({ isComplete: false })))

    expect(loaded.status === 'ok' && loaded.draft.setupConfig.isComplete).toBe(true)
  })

  it('lo que no es un export se rechaza con su motivo', () => {
    expect(readProjectFile('{ roto')).toEqual({ status: 'error', message: NOT_JSON_MESSAGE })
    expect(readProjectFile('[]')).toEqual({ status: 'error', message: NOT_EXPORT_MESSAGE })
    expect(readProjectFile('{"a": 1}')).toEqual({ status: 'error', message: NOT_EXPORT_MESSAGE })
  })

  it('un export de antes de builderDraft pide volver a exportarlo', () => {
    const legacy: Partial<FormExportFile> = icaFile()
    delete legacy.builderDraft

    expect(readProjectFile(JSON.stringify(legacy))).toEqual({
      status: 'error',
      message: LEGACY_EXPORT_MESSAGE,
    })
  })

  it('uno de una versión más nueva pide actualizar', () => {
    const file: FormExportFile = icaFile()
    const newer = {
      ...file,
      builderDraft: { ...file.builderDraft, schemaVersion: DRAFT_SCHEMA_VERSION + 1 },
    }

    expect(readProjectFile(JSON.stringify(newer))).toEqual({
      status: 'error',
      message: NEWER_VERSION_MESSAGE,
    })
  })

  it('un proyecto dañado se rechaza', () => {
    const file: FormExportFile = icaFile()
    const damaged = { ...file, builderDraft: { ...file.builderDraft, formSteps: 'nada' } }

    expect(readProjectFile(JSON.stringify(damaged))).toEqual({
      status: 'error',
      message: DAMAGED_MESSAGE,
    })
  })
})

describe('summarizeProjectFile', () => {
  it('resume tipo, pasos y campos del formulario', () => {
    const loaded: ProjectFileLoad = readProjectFile(JSON.stringify(icaFile()))
    if (loaded.status !== 'ok') throw new Error('no abrio')

    const summary = summarizeProjectFile(loaded.draft)

    expect(summary.formTypeLabel).toBe('Industria y Comercio')
    expect(summary.stepCount).toBe(8)
    expect(summary.introStepCount).toBe(INDUSTRIA_COMERCIO_INTRO_STEPS)
    expect(summary.fieldCount).toBe(
      loaded.draft.formSteps.flatMap((step) => step.rows.flatMap((row) => row.fields)).length,
    )
  })

  it('sin tipo, "Sin definir"', () => {
    const loaded: ProjectFileLoad = readProjectFile(JSON.stringify(icaFile({ formType: null })))
    if (loaded.status !== 'ok') throw new Error('no abrio')

    expect(summarizeProjectFile(loaded.draft).formTypeLabel).toBe('Sin definir')
  })
})
