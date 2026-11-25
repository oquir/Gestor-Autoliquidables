import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { INDUSTRIA_COMERCIO_INTRO_STEPS } from '../../src/constants/baseTemplate'
import { buildInitialFormSteps, buildInitialIntroSteps } from '../../src/store/formStore.utils'
import { installMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage'
import type { CanvasField, DraftLoad, DraftPayload, FormStep } from '../../src/types'
import {
  buildDraftPayload,
  clearDraft,
  isNewerDraft,
  loadDraft,
  parseDraft,
  saveDraft,
} from '../../src/lib/persistence/persistence'
import {
  DRAFT_KEY,
  DRAFT_QUOTA_MESSAGE,
  DRAFT_SAVE_FAILED_MESSAGE,
  DRAFT_SCHEMA_VERSION,
} from '../../src/lib/persistence/persistence.constants'
import { migrateDraft } from '../../src/lib/persistence/persistence.migrations'

// Un borrador viejo tiene que abrir igual que cuando se guardo. Los fixtures son el JSON minimo de
// cada version, escrito a mano con la forma de entonces.

type Loose = Record<string, unknown>

function field(overrides: Loose): Loose {
  return {
    id: `id-${String(overrides.name ?? overrides.label)}`,
    type: 'number',
    label: 'Campo',
    colStart: 0,
    colSpan: 4,
    validations: {},
    styles: {},
    logic: {},
    ...overrides,
  }
}

function draftAt(version: number | undefined, fields: Loose[], extra: Loose = {}): Loose {
  return {
    ...(version === undefined ? {} : { schemaVersion: version }),
    formSteps: [
      { stepId: 'paso-1', title: 'Paso 1', rows: [{ id: 'fila-1', columns: 16, fields }] },
    ],
    introModal: { steps: [] },
    setupConfig: {
      isComplete: true,
      formType: 'industria_comercio',
      hasIntroModal: false,
      introModalSteps: 0,
    },
    savedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  }
}

function fieldsOf(load: DraftLoad): CanvasField[] {
  if (load.status !== 'ok') throw new Error(`Se esperaba un borrador valido, llego ${load.status}`)

  return load.draft.formSteps.flatMap((step) => step.rows.flatMap((row) => row.fields))
}

function byName(load: DraftLoad, name: string): CanvasField {
  const found: CanvasField | undefined = fieldsOf(load).find((candidate) => candidate.name === name)
  if (!found) throw new Error(`No hay campo ${name}`)

  return found
}

describe('migrateDraft', () => {
  it('lleva cualquier versión vieja a la actual', () => {
    // Derivada de la constante: al subir la version, la anterior entra sola a la lista.
    const oldVersions: (number | undefined)[] = [
      undefined,
      ...Array.from({ length: DRAFT_SCHEMA_VERSION - 1 }, (_, index: number) => index + 1),
    ]
    for (const version of oldVersions) {
      expect(migrateDraft(draftAt(version, [])).schemaVersion).toBe(DRAFT_SCHEMA_VERSION)
    }
  })

  it('un borrador sin versión se trata como v1: gana el preludio vacío', () => {
    const migrated: Loose = migrateDraft(draftAt(undefined, []))

    expect(migrated.formScript).toBe('')
  })

  it('no toca uno que ya está en la versión actual', () => {
    const current: Loose = draftAt(DRAFT_SCHEMA_VERSION, [], { formScript: 'const x = 1;' })

    expect(migrateDraft(current)).toBe(current)
  })
})

describe('parseDraft: borradores viejos', () => {
  it('v1 -> v7: la fórmula pasa a script con {{campo}}', () => {
    const load: DraftLoad = parseDraft(
      draftAt(1, [
        field({ name: 'ingresos' }),
        field({ name: 'tarifa' }),
        field({
          name: 'impuesto',
          type: 'calculated',
          logic: { formula: 'ingresos * tarifa / 1000' },
        }),
      ]),
    )

    expect(load.status).toBe('ok')
    expect(byName(load, 'impuesto').logic.script).toBe('return {{ingresos}} * {{tarifa}} / 1000;')
  })

  it('v2: sumOf de una columna pasa a sum({{columna}})', () => {
    const load: DraftLoad = parseDraft(
      draftAt(
        2,
        [
          field({ name: 'impuesto_actividad' }),
          field({
            name: 'total',
            type: 'calculated',
            logic: { formula: 'sumOf(impuesto_actividad)' },
          }),
        ],
        { formScript: '' },
      ),
    )

    expect(byName(load, 'total').logic.script).toBe('return sum({{impuesto_actividad}});')
  })

  it('v2: una fórmula que no parsea queda como comentario y deja de calcular', () => {
    const load: DraftLoad = parseDraft(
      draftAt(2, [field({ name: 'roto', logic: { formula: 'a + * b' } })], { formScript: '' }),
    )
    const script: string = byName(load, 'roto').logic.script ?? ''

    expect(script).toContain('// a + * b')
    expect(script.endsWith('return undefined;')).toBe(true)
  })

  it('v3: el efecto de regla con fórmula pasa a script', () => {
    const load: DraftLoad = parseDraft(
      draftAt(
        3,
        [
          field({ name: 'base' }),
          field({
            name: 'valor',
            logic: {
              rules: [
                {
                  id: 'regla-1',
                  matchAll: true,
                  when: [],
                  effects: [{ id: 'efecto-1', kind: 'formula', expression: 'base * 2' }],
                },
              ],
            },
          }),
        ],
        { formScript: '' },
      ),
    )

    expect(byName(load, 'valor').logic.rules?.[0].effects[0]).toEqual({
      id: 'efecto-1',
      kind: 'script',
      source: 'return {{base}} * 2;',
    })
  })

  it('v4: el almacén de partes se borra del borrador', () => {
    const migrated: Loose = migrateDraft(
      draftAt(4, [], { formScript: '', savedComponents: [field({ name: 'guardado' })] }),
    )

    // Las migraciones siguientes (mapDraftFields) vuelven a escribir la clave con undefined; lo que
    // importa es que el contenido no llega a JSON ni al esquema.
    expect(migrated.savedComponents).toBeUndefined()
    expect(JSON.stringify(migrated)).not.toContain('savedComponents')
  })

  it('v5: las clases de Tailwind pasan a CSS y lo que no se traduce queda comentado', () => {
    const load: DraftLoad = parseDraft({
      ...draftAt(
        5,
        [
          field({
            name: 'titulo',
            styles: { customClasses: 'font-bold text-center mt-4' },
            tooltip: {
              content: [],
              position: 'top',
              customClasses: 'italic',
            },
          }),
        ],
        { formScript: '' },
      ),
    })
    const titulo: CanvasField = byName(load, 'titulo')

    expect(titulo.styles.customCss).toBe(
      'font-weight: 700;\ntext-align: center;\n/* Estas clases de Tailwind no se pudieron traducir al migrar, reescribilas como CSS: mt-4 */',
    )
    expect(titulo.tooltip?.customCss).toBe('font-style: italic;')
  })

  it('v6: {campo} pasa a {{campo}} solo si es un campo conocido', () => {
    const load: DraftLoad = parseDraft(
      draftAt(
        6,
        [
          field({ name: 'base' }),
          field({
            name: 'valor',
            logic: { script: 'const o = {desconocido}; return {base} + { base };' },
          }),
        ],
        { formScript: 'const doble = {base} * 2;' },
      ),
    )

    expect(byName(load, 'valor').logic.script).toBe(
      'const o = {desconocido}; return {{base}} + {{base}};',
    )
    if (load.status === 'ok') expect(load.draft.formScript).toBe('const doble = {{base}} * 2;')
  })

  it('v6: también los checks de grupo', () => {
    const load: DraftLoad = parseDraft({
      ...draftAt(6, [field({ name: 'ingresos' })], { formScript: '' }),
      formSteps: [
        {
          stepId: 'paso-1',
          title: 'Paso 1',
          rows: [{ id: 'fila-1', columns: 16, fields: [field({ name: 'ingresos' })] }],
          groups: [
            {
              id: 'grupo-1',
              name: 'actividades',
              title: 'Actividades',
              min: 1,
              max: 5,
              checks: [
                {
                  id: 'check-1',
                  label: 'Suma',
                  enabled: true,
                  script: 'return sum({ingresos}) > 0;',
                  message: 'Falta',
                },
              ],
            },
          ],
        },
      ],
    })

    if (load.status !== 'ok') throw new Error('borrador invalido')
    expect(load.draft.formSteps[0].groups?.[0].checks?.[0].script).toBe(
      'return sum({{ingresos}}) > 0;',
    )
  })

  it('las filas sin colStart se parten en líneas visuales', () => {
    const load: DraftLoad = parseDraft(
      draftAt(
        7,
        [
          field({ name: 'a', colStart: undefined, colSpan: 10 }),
          field({ name: 'b', colStart: undefined, colSpan: 10 }),
        ],
        { formScript: '' },
      ),
    )

    if (load.status !== 'ok') throw new Error('borrador invalido')
    expect(load.draft.formSteps[0].rows.map((row) => row.fields.map((f) => f.name))).toEqual([
      ['a'],
      ['b'],
    ])
  })
})

describe('parseDraft: nombres', () => {
  it('un nombre repetido entre los dos lienzos se renombra y se avisa', () => {
    const load: DraftLoad = parseDraft({
      ...draftAt(7, [field({ name: 'periodo', label: 'Periodo del paso' })], { formScript: '' }),
      introModal: {
        steps: [
          {
            stepId: 'intro-1',
            title: 'Intro',
            rows: [
              { id: 'fila-i', columns: 16, fields: [field({ name: 'periodo', label: 'Periodo' })] },
            ],
          },
        ],
      },
    })

    if (load.status !== 'ok') throw new Error('borrador invalido')
    expect(load.draft.introModal.steps[0].rows[0].fields[0].name).toBe('periodo_2')
    expect(load.renamed).toEqual([{ from: 'periodo', to: 'periodo_2', label: 'Periodo' }])
  })

  it('un campo sin nombre toma el slug del rótulo sin contar como renombre', () => {
    const load: DraftLoad = parseDraft(
      draftAt(7, [field({ name: undefined, label: 'Número de documento' })], { formScript: '' }),
    )

    if (load.status !== 'ok') throw new Error('borrador invalido')
    expect(fieldsOf(load)[0].name).toBe('numero_de_documento')
    expect(load.renamed).toEqual([])
  })
})

describe('parseDraft: inválidos', () => {
  it('lo que no es un objeto es inválido', () => {
    expect(parseDraft(null).status).toBe('invalid')
    expect(parseDraft('texto').status).toBe('invalid')
    expect(parseDraft(42).status).toBe('invalid')
  })

  it('con la forma rota o sin pasos es inválido', () => {
    expect(parseDraft({ schemaVersion: DRAFT_SCHEMA_VERSION }).status).toBe('invalid')
    expect(parseDraft(draftAt(7, [field({ colSpan: 'ancho' })], { formScript: '' })).status).toBe(
      'invalid',
    )
    expect(parseDraft({ ...draftAt(7, [], { formScript: '' }), formSteps: [] }).status).toBe(
      'invalid',
    )
  })

  it('uno más nuevo que la app no se migra hacia atrás', () => {
    const newer: Loose = draftAt(DRAFT_SCHEMA_VERSION + 1, [], { formScript: '' })

    expect(isNewerDraft(newer)).toBe(true)
    expect(isNewerDraft(draftAt(DRAFT_SCHEMA_VERSION, []))).toBe(false)
    expect(parseDraft(newer).status).toBe('invalid')
  })

  it('sanea un enlace peligroso del texto enriquecido', () => {
    const load: DraftLoad = parseDraft(
      draftAt(
        7,
        [
          field({
            name: 'nota',
            type: 'rich_text',
            content: [
              { type: 'paragraph', children: [{ text: 'clic', href: 'javascript:alert(1)' }] },
            ],
          }),
        ],
        { formScript: '' },
      ),
    )

    expect(byName(load, 'nota').content?.[0].children[0].href).toBeUndefined()
  })
})

describe('el ICA de fábrica', () => {
  it('guardado y vuelto a abrir queda idéntico', () => {
    const formSteps: FormStep[] = buildInitialFormSteps('industria_comercio')
    const payload: DraftPayload = buildDraftPayload({
      formSteps,
      introModal: {
        steps: buildInitialIntroSteps('industria_comercio', INDUSTRIA_COMERCIO_INTRO_STEPS),
      },
      formScript: '',
      setupConfig: {
        isComplete: true,
        formType: 'industria_comercio',
        hasIntroModal: true,
        introModalSteps: INDUSTRIA_COMERCIO_INTRO_STEPS,
      },
    })
    const load: DraftLoad = parseDraft(JSON.parse(JSON.stringify(payload)))

    expect(load.status).toBe('ok')
    if (load.status !== 'ok') return
    expect(load.renamed).toEqual([])
    expect(load.draft).toEqual(JSON.parse(JSON.stringify(payload)))
  })
})

describe('saveDraft y loadDraft', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = installMemoryStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const minimal = {
    formSteps: [{ stepId: 'paso-1', title: 'Paso 1', rows: [] }],
    introModal: { steps: [] },
    formScript: '',
    setupConfig: {
      isComplete: true,
      formType: 'industria_comercio' as const,
      hasIntroModal: false,
      introModalSteps: 0,
    },
  }

  it('sin borrador, vacío; con uno, lo devuelve', () => {
    expect(loadDraft()).toEqual({ status: 'empty' })

    expect(saveDraft(minimal)).toEqual({ ok: true })
    const load: DraftLoad = loadDraft()

    expect(load.status).toBe('ok')
    if (load.status === 'ok') expect(load.draft.formSteps[0].title).toBe('Paso 1')
  })

  it('un JSON roto en localStorage es inválido, no una excepción', () => {
    storage.setItem(DRAFT_KEY, '{ esto no es json')

    expect(loadDraft()).toEqual({ status: 'invalid' })
  })

  it('con el almacenamiento lleno devuelve el error de cuota y no lanza', () => {
    storage.quotaBytes = 10

    expect(saveDraft(minimal)).toEqual({ ok: false, error: DRAFT_QUOTA_MESSAGE })
  })

  it('otro error del navegador da el mensaje general', () => {
    storage.setItem = () => {
      throw new Error('SecurityError')
    }

    expect(saveDraft(minimal)).toEqual({ ok: false, error: DRAFT_SAVE_FAILED_MESSAGE })
  })

  it('clearDraft lo borra', () => {
    saveDraft(minimal)
    clearDraft()

    expect(loadDraft()).toEqual({ status: 'empty' })
  })
})
