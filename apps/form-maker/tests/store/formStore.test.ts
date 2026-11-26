import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { FIELD_TYPES } from '../../src/constants/fieldTypes'
import type { CanvasField, CanvasRow, FieldTypeDef, FormState, FormStep } from '../../src/types'
import { fieldId, makeField, makeGroup, makeRow, makeStep } from '../helpers/canvasFixtures'
import { installMemoryStorage } from '../helpers/memoryStorage'
import { later, soon, startClock, stopClock } from '../helpers/storeHarness'

// Las acciones del store, sin interfaz: cada una cambia el documento como debe, limpia lo que
// queda colgando y se deshace exacta. Los bancos del simulador leen localStorage al crear el store:
// se instala antes del import.
installMemoryStorage()
// El reloj falso antes del import: createBurstGate guarda Date.now al cargarse el modulo.
startClock()
// Modulo nuevo: sin aislamiento entre archivos el store ya cargado por otra prueba guardo el
// Date.now del reloj real y no lee el localStorage de esta.
vi.resetModules()
const { useFormStore } = await import('../../src/store/formStore')

const INITIAL: FormState = useFormStore.getState()

function state(): FormState {
  return useFormStore.getState()
}

function pastSteps(): number {
  return useFormStore.temporal.getState().pastStates.length
}

function fieldNamed(name: string): CanvasField | undefined {
  const rows: CanvasRow[] = [
    ...state().formSteps.flatMap((step) => step.rows),
    ...state().introModal.steps.flatMap((step) => step.rows),
  ]
  return rows.flatMap((row) => row.fields).find((field) => field.name === name)
}

function namesOf(step: FormStep): string[] {
  return step.rows.flatMap((row) => row.fields.map((field) => field.name))
}

function paletteType(type: string): FieldTypeDef {
  const found: FieldTypeDef | undefined = FIELD_TYPES.find((item) => item.type === type)
  if (!found) throw new Error(`No hay tipo ${type}`)
  return found
}

// Un documento conocido: "Datos" con tipo, detalle (visible si tipo) y una etiqueta de detalle;
// "Actividades" con un grupo mapeado; el modal con periodo.
function load(): void {
  const datos: FormStep = makeStep('Datos', [
    makeField('select', 'tipo'),
    makeRow([
      makeField('label', 'rotulo', { labelFor: fieldId('detalle') }),
      makeField('text', 'detalle', {
        visibleWhen: { fieldId: fieldId('tipo'), operator: 'equals', value: '1' },
        validations: {
          overrides: [
            {
              id: 'o',
              when: { fieldId: fieldId('tipo'), operator: 'equals', value: '2' },
              validations: { required: true },
            },
          ],
        },
        logic: {
          rules: [
            {
              id: 'r',
              matchAll: true,
              when: [{ id: 'w', fieldId: fieldId('tipo'), operator: 'isNotEmpty' }],
              effects: [],
            },
          ],
        },
      }),
    ]),
    makeField('select', 'municipio', {
      dataSource: { catalog: 'municipios', dependsOn: fieldId('tipo') },
    }),
  ])
  const actividades: FormStep = makeStep(
    'Actividades',
    [
      makeRow(
        [
          makeField('number', 'ingresos', {
            apiBinding: { kind: 'mapped', path: 'actividades[].ingresoGravado' },
          }),
        ],
        'grupo-actividades',
      ),
      makeField('number', 'total'),
    ],
    [makeGroup('actividades', { arrayPath: 'actividades' })],
  )

  useFormStore.setState({
    formSteps: [datos, actividades],
    introModal: {
      steps: [
        { stepId: 'intro', title: 'Intro', rows: [makeRow([makeField('select', 'periodo')])] },
      ],
    },
    activeCanvas: { type: 'formStep', stepId: datos.stepId },
    selectedFieldIds: [],
    transferNotice: null,
  })
  useFormStore.temporal.getState().clear()
}

afterAll(() => {
  stopClock()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  useFormStore.setState(INITIAL, true)
  load()
  later()
})

describe('asistente y borrador', () => {
  it('completeSetup arma el ICA de fábrica y no se deshace hacia el lienzo en blanco', () => {
    state().completeSetup({
      formType: 'industria_comercio',
      hasIntroModal: true,
      introModalSteps: 2,
    })

    expect(state().formSteps).toHaveLength(8)
    expect(state().introModal.steps).toHaveLength(2)
    expect(state().activeCanvas).toEqual({ type: 'formStep', stepId: state().formSteps[0].stepId })
    expect(pastSteps()).toBe(0)
  })

  it('restoreDraft carga el borrador y limpia el historial', () => {
    state().addFormStep()
    later()
    state().restoreDraft({
      formSteps: [makeStep('Uno', [makeField('text', 'a')])],
      introModal: { steps: [] },
      formScript: 'const A = 1;',
      setupConfig: {
        isComplete: true,
        formType: 'autorretencion',
        hasIntroModal: false,
        introModalSteps: 0,
      },
    })

    expect(state().formSteps.map((step) => step.title)).toEqual(['Uno'])
    expect(state().formScript).toBe('const A = 1;')
    expect(pastSteps()).toBe(0)
  })
})

describe('pasos', () => {
  it('agregar uno lo activa; deshacer lo quita', () => {
    state().addFormStep()

    expect(state().formSteps).toHaveLength(3)
    expect(state().activeCanvas.stepId).toBe(state().formSteps[2].stepId)

    later()
    state().undo()
    expect(state().formSteps).toHaveLength(2)
    expect(state().activeCanvas.stepId).toBe('paso-Datos')
  })

  it('quitar un paso limpia lo que miraba a sus campos desde otros pasos', () => {
    // total (Actividades) observa a tipo (Datos).
    state().setFieldVisibleWhen(fieldId('total'), {
      fieldId: fieldId('tipo'),
      operator: 'isNotEmpty',
    })
    later()
    state().removeFormStep('paso-Datos')

    expect(state().formSteps.map((step) => step.title)).toEqual(['Actividades'])
    expect(fieldNamed('total')?.visibleWhen).toBeUndefined()
    expect(state().activeCanvas.stepId).toBe('paso-Actividades')
  })

  it('el último paso no se quita', () => {
    state().removeFormStep('paso-Actividades')
    later()
    const before: FormState = state()
    state().removeFormStep('paso-Datos')

    expect(state()).toBe(before)
  })

  it('ocultar un paso pone la bandera; mostrarlo la borra', () => {
    state().setFormStepHidden('paso-Datos', true)
    expect(state().formSteps[0].hidden).toBe(true)

    state().setFormStepHidden('paso-Datos', false)
    expect('hidden' in state().formSteps[0]).toBe(false)
  })

  it('los pasos del modal mantienen al día la configuración', () => {
    state().addIntroModalStep()
    expect(state().setupConfig).toMatchObject({ hasIntroModal: true, introModalSteps: 2 })

    state().removeIntroModalStep('intro')
    state().removeIntroModalStep(state().introModal.steps[0].stepId)
    expect(state().setupConfig).toMatchObject({ hasIntroModal: false, introModalSteps: 0 })
  })
})

describe('campos', () => {
  it('un clic en la paleta agrega una fila con el campo, con nombre único, y lo selecciona', () => {
    state().appendFieldToActiveCanvas(paletteType('text'))
    state().appendFieldToActiveCanvas(paletteType('text'))

    const names: string[] = namesOf(state().formSteps[0])
    expect(names.slice(-2)).toEqual(['texto', 'texto_2'])
    expect(state().selectedFieldIds).toEqual([fieldNamed('texto_2')?.id])
  })

  it('una fila llena no recibe otro campo', () => {
    const full: CanvasRow = makeRow([makeField('text', 'ancho', { colSpan: 16 })])
    useFormStore.setState({ formSteps: [makeStep('Datos', [full])] })
    later()
    const before: FormState = state()
    state().addFieldToRow(full.id, paletteType('number'))

    expect(state()).toBe(before)
  })

  it('borrar un campo limpia toda referencia a él y lo saca de la selección', () => {
    state().setFieldSelection([fieldId('tipo'), fieldId('detalle')])
    later()
    state().removeFields([fieldId('tipo')])

    const detalle: CanvasField | undefined = fieldNamed('detalle')
    expect(fieldNamed('tipo')).toBeUndefined()
    expect(detalle?.visibleWhen).toBeUndefined()
    expect(detalle?.validations.overrides).toEqual([])
    // Una regla que se queda sin condiciones se descarta: aplicaria siempre.
    expect(detalle?.logic.rules).toEqual([])
    expect(fieldNamed('municipio')?.dataSource).toEqual({
      catalog: 'municipios',
      dependsOn: undefined,
      fills: undefined,
    })
    expect(state().selectedFieldIds).toEqual([fieldId('detalle')])
  })

  it('borrar el campo de una etiqueta deja la etiqueta sin vínculo', () => {
    state().removeFields([fieldId('detalle')])

    expect(fieldNamed('rotulo')?.labelFor).toBeUndefined()
  })

  it('sacar un campo de un grupo le quita el mapeo', () => {
    const target: CanvasRow | undefined = state().formSteps[1].rows.find(
      (row) => row.groupId === undefined,
    )
    if (!target) throw new Error('sin fila suelta')
    state().moveField(fieldId('ingresos'), target.id)

    expect(fieldNamed('ingresos')?.apiBinding).toBeUndefined()
  })

  it('un concepto que entra a un grupo queda excluido', () => {
    state().updateFieldApiBinding(fieldId('total'), { kind: 'concept', idConcepto: 3 })
    later()
    const groupRow: CanvasRow | undefined = state().formSteps[1].rows.find(
      (row) => row.groupId !== undefined,
    )
    if (!groupRow) throw new Error('sin fila de grupo')
    state().moveField(fieldId('total'), groupRow.id)

    expect(fieldNamed('total')?.apiBinding).toEqual({ kind: 'excluded' })
  })

  it('renombrar pasa a slug y no repite nombres', () => {
    state().setFieldName(fieldId('detalle'), 'Tipo')

    expect(fieldNamed('tipo_2')?.id).toBe(fieldId('detalle'))
  })

  it('updateField sin cambios devuelve el mismo estado y no crea un paso', () => {
    const before: FormState = state()
    state().updateField(fieldId('tipo'), { label: 'tipo' })

    expect(state()).toBe(before)
    expect(pastSteps()).toBe(0)
  })

  it('una edición conserva los pasos y filas que no tocó', () => {
    const before: FormState = state()
    state().updateField(fieldId('total'), { label: 'Total general' })

    expect(state().formSteps[0]).toBe(before.formSteps[0])
    expect(state().formSteps[1]).not.toBe(before.formSteps[1])
    expect(state().introModal).toBe(before.introModal)
    expect(state().formSteps[1].rows[0]).toBe(before.formSteps[1].rows[0])
  })

  it('el ancho se recorta al hueco libre de la fila', () => {
    useFormStore.setState({
      formSteps: [
        makeStep('Datos', [
          makeRow([makeField('text', 'a', { colSpan: 4 }), makeField('text', 'b', { colSpan: 4 })]),
        ]),
      ],
    })
    later()
    state().updateField(fieldId('a'), { colSpan: 16 })

    expect(fieldNamed('a')?.colSpan).toBe(4)
  })
})

describe('propiedades del campo: lo que equivale al valor por defecto no se guarda', () => {
  it('las banderas apagadas y los textos vacíos borran la clave', () => {
    const id: string = fieldId('total')
    state().setFieldRounding(id, true)
    state().setFieldAffix(id, 'prefix', '$')
    state().setFieldScript(id, 'return 1;')
    expect(fieldNamed('total')).toMatchObject({
      rounding: true,
      prefix: '$',
      logic: { script: 'return 1;' },
    })

    state().setFieldRounding(id, false)
    state().setFieldAffix(id, 'prefix', '')
    state().setFieldScript(id, '   ')
    const total: CanvasField | undefined = fieldNamed('total')
    expect(total?.rounding).toBeUndefined()
    expect(total?.prefix).toBeUndefined()
    expect(total?.logic.script).toBeUndefined()
  })

  it('negativos: se guarda el false; el teléfono celular no se guarda', () => {
    state().setFieldAllowsNegative(fieldId('total'), false)
    expect(fieldNamed('total')?.allowsNegative).toBe(false)
    state().setFieldAllowsNegative(fieldId('total'), true)
    expect(fieldNamed('total')?.allowsNegative).toBeUndefined()

    state().setFieldPhoneKind(fieldId('detalle'), 'fijo')
    expect(fieldNamed('detalle')?.phoneKind).toBe('fijo')
    state().setFieldPhoneKind(fieldId('detalle'), 'celular')
    expect(fieldNamed('detalle')?.phoneKind).toBeUndefined()
  })

  it('las opciones a mano solo existen fuera del contrato y sin catálogo', () => {
    state().updateFieldApiBinding(fieldId('tipo'), { kind: 'excluded' }, { optionCount: 3 })
    expect(fieldNamed('tipo')?.options).toHaveLength(3)

    state().addFieldOption(fieldId('tipo'))
    expect(fieldNamed('tipo')?.options?.[3].label).toBe('Opción 4')

    state().updateFieldDataSource(fieldId('tipo'), { catalog: 'tipos' })
    expect(fieldNamed('tipo')?.options).toBeUndefined()
  })

  it('reglas y validaciones condicionales se agregan, se editan y se quitan', () => {
    state().addFieldRule(fieldId('total'))
    const ruleId: string = fieldNamed('total')?.logic.rules?.[0].id ?? ''
    state().updateFieldRule(fieldId('total'), ruleId, { label: 'Especial' })
    expect(fieldNamed('total')?.logic.rules?.[0].label).toBe('Especial')
    state().removeFieldRule(fieldId('total'), ruleId)
    expect(fieldNamed('total')?.logic.rules).toEqual([])

    state().addFieldValidationOverride(fieldId('total'))
    const overrideId: string = fieldNamed('total')?.validations.overrides?.[0].id ?? ''
    state().updateFieldValidationOverride(fieldId('total'), overrideId, { validations: { min: 1 } })
    state().updateFieldValidationOverride(fieldId('total'), overrideId, { validations: { max: 9 } })
    expect(fieldNamed('total')?.validations.overrides?.[0].validations).toEqual({ min: 1, max: 9 })
  })

  it('setFieldLabelFor: una etiqueta por campo; la anterior se desvincula', () => {
    useFormStore.setState({
      formSteps: [
        makeStep('Datos', [
          makeField('label', 'uno', { labelFor: fieldId('campo') }),
          makeField('label', 'dos'),
          makeField('text', 'campo'),
        ]),
      ],
    })
    later()
    state().setFieldLabelFor(fieldId('dos'), fieldId('campo'))

    expect(fieldNamed('dos')?.labelFor).toBe(fieldId('campo'))
    expect(fieldNamed('uno')?.labelFor).toBeUndefined()
  })
})

describe('mudanzas entre pasos', () => {
  it('la etiqueta viaja con su campo y la vista va al destino', () => {
    state().moveFieldsToStep([fieldId('detalle')], { type: 'formStep', stepId: 'paso-Actividades' })

    expect(namesOf(state().formSteps[1])).toEqual(expect.arrayContaining(['rotulo', 'detalle']))
    expect(namesOf(state().formSteps[0])).not.toContain('rotulo')
    expect(state().activeCanvas).toEqual({ type: 'formStep', stepId: 'paso-Actividades' })
    expect(state().selectedFieldIds).toEqual([fieldId('detalle')])
  })

  it('un campo que sale de un grupo hacia otro paso pierde el mapeo', () => {
    state().moveFieldsToStep([fieldId('ingresos')], { type: 'formStep', stepId: 'paso-Datos' })

    expect(fieldNamed('ingresos')?.apiBinding).toBeUndefined()
  })

  it('llevar al modal un campo que depende del formulario avisa', () => {
    state().moveFieldsToStep([fieldId('municipio')], { type: 'introStep', stepId: 'intro' })

    expect(state().transferNotice).toContain('municipio')
  })

  it('una fila de un grupo no cambia de paso', () => {
    const groupRow: CanvasRow | undefined = state().formSteps[1].rows.find(
      (row) => row.groupId !== undefined,
    )
    if (!groupRow) throw new Error('sin fila de grupo')
    const before: FormState = state()
    state().moveRowToStep(groupRow.id, { type: 'formStep', stepId: 'paso-Datos' })

    expect(state()).toBe(before)
  })
})

describe('filas y grupos', () => {
  it('las columnas nunca bajan del número de campos', () => {
    const row: CanvasRow = state().formSteps[0].rows[1]
    state().updateRowColumns(row.id, 1)

    expect(state().formSteps[0].rows[1].columns).toBe(2)
  })

  it('quitar una fila se lleva sus campos y limpia lo que los miraba', () => {
    const row: CanvasRow = state().formSteps[0].rows[0]
    state().removeRow(row.id)

    expect(fieldNamed('tipo')).toBeUndefined()
    expect(fieldNamed('detalle')?.visibleWhen).toBeUndefined()
  })

  it('cambiar el arrayPath de un grupo borra el mapeo de sus campos', () => {
    state().updateGroup('grupo-actividades', { arrayPath: 'otras' })

    expect(fieldNamed('ingresos')?.apiBinding).toBeUndefined()
  })

  it('el nombre del grupo es único y los topes se acotan', () => {
    state().updateGroup('grupo-actividades', { name: 'Total', min: 5, max: 2 })

    expect(state().formSteps[1].groups?.[0]).toMatchObject({ name: 'total_2', min: 5, max: 5 })
  })

  it('quitar el grupo conserva sus filas', () => {
    state().removeGroup('grupo-actividades')

    expect(state().formSteps[1].groups).toBeUndefined()
    expect(fieldNamed('ingresos')).toBeDefined()
  })
})

describe('selección', () => {
  it('elegir lo ya elegido no cambia el estado', () => {
    state().selectField(fieldId('tipo'))
    const before: FormState = state()
    state().selectField(fieldId('tipo'))
    state().setFieldSelection([fieldId('tipo')])

    expect(state()).toBe(before)
  })

  it('la selección no crea pasos de historial', () => {
    state().selectField(fieldId('tipo'))
    later()
    state().toggleFieldSelection(fieldId('detalle'))

    expect(pastSteps()).toBe(0)
  })
})

describe('deshacer y rehacer', () => {
  it('cada acción se deshace y se rehace exacta', () => {
    const original: FormStep[] = state().formSteps
    state().updateField(fieldId('total'), { label: 'Uno' })
    const afterFirst: FormStep[] = state().formSteps
    later()
    state().removeFields([fieldId('tipo')])

    state().undo()
    expect(state().formSteps).toEqual(afterFirst)
    state().undo()
    expect(state().formSteps).toEqual(original)
    state().redo()
    expect(state().formSteps).toEqual(afterFirst)
  })

  it('deshacer un borrado devuelve el campo y sus referencias', () => {
    state().removeFields([fieldId('tipo')])
    later()
    state().undo()

    expect(fieldNamed('tipo')).toBeDefined()
    expect(fieldNamed('detalle')?.visibleWhen?.fieldId).toBe(fieldId('tipo'))
  })

  it('una ráfaga de cambios es un solo paso', () => {
    state().updateField(fieldId('total'), { label: 'T' })
    soon()
    state().updateField(fieldId('total'), { label: 'To' })
    soon()
    state().updateField(fieldId('total'), { label: 'Tot' })

    expect(pastSteps()).toBe(1)
    later()
    state().undo()
    expect(fieldNamed('total')?.label).toBe('total')
  })

  it('tras deshacer, la selección no apunta a campos que ya no están', () => {
    state().appendFieldToActiveCanvas(paletteType('number'))
    later()
    const added: string = state().selectedFieldIds[0]
    expect(added).toBeDefined()
    state().undo()

    expect(state().selectedFieldIds).not.toContain(added)
  })

  it('deshacer una mudanza quita su aviso de cruce', () => {
    state().moveFieldsToStep([fieldId('municipio')], { type: 'introStep', stepId: 'intro' })
    expect(state().transferNotice).not.toBeNull()
    later()
    state().undo()

    expect(fieldNamed('municipio')).toBeDefined()
    expect(state().transferNotice).toBeNull()
  })

  it('los bancos del simulador no entran al historial', () => {
    state().setCatalogEntries('municipios', [{ id: '1', label: 'Medellín' }])
    later()
    state().setValores([{ anio: 2026, uvt: 1, smmlv: 1 }])

    expect(pastSteps()).toBe(0)
  })
})

describe('selectores', () => {
  it('sin filas o sin grupos devuelven siempre el mismo arreglo vacío', async () => {
    const { getActiveGroups, getActiveRows, getSelectedFieldId } =
      await import('../../src/store/formStore')
    const missing = { ...state(), activeCanvas: { type: 'formStep' as const, stepId: 'nada' } }

    expect(getActiveRows(missing)).toBe(getActiveRows(missing))
    expect(
      getActiveGroups({ ...state(), activeCanvas: { type: 'introStep', stepId: 'intro' } }),
    ).toBe(getActiveGroups({ ...state(), activeCanvas: { type: 'introStep', stepId: 'intro' } }))
    expect(getSelectedFieldId({ selectedFieldIds: ['a', 'b'] })).toBeNull()
    expect(getSelectedFieldId({ selectedFieldIds: ['a'] })).toBe('a')
  })
})
