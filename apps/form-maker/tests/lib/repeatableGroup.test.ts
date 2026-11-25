import { describe, expect, it } from 'vitest'
import { createGroupCheck, enabledChecks } from '../../src/lib/groupCheck/groupCheck'
import {
  clampGroupBounds,
  createRepeatableGroup,
  detachGroup,
  findGroupById,
  findGroupIdForField,
  groupFields,
  groupNamesInUse,
  normalizeGroupRows,
  pruneEmptyGroups,
} from '../../src/lib/repeatableGroup/repeatableGroup'
import type { CanvasRow, FormStep, GroupCheck, RepeatableGroup } from '../../src/types'
import { makeField, makeGroup, makeRow, makeStep } from '../helpers/canvasFixtures'

describe('crear y acotar', () => {
  it('nace con un nombre único sacado del título y los topes por defecto', () => {
    const group: RepeatableGroup = createRepeatableGroup(
      'Otras Actividades',
      new Set(['otras_actividades']),
    )

    expect(group).toMatchObject({
      name: 'otras_actividades_2',
      title: 'Otras Actividades',
      min: 1,
      max: 15,
    })
  })

  it('clampGroupBounds deja el mínimo entre 0 y 99 y el máximo nunca debajo del mínimo', () => {
    expect(clampGroupBounds(-3, 200)).toEqual({ min: 0, max: 99 })
    expect(clampGroupBounds(5, 2)).toEqual({ min: 5, max: 5 })
    expect(clampGroupBounds(1.6, 3.4)).toEqual({ min: 2, max: 3 })
  })
})

describe('buscar', () => {
  const rows: CanvasRow[] = [
    makeRow([makeField('text', 'suelto')]),
    makeRow([makeField('number', 'ingresos'), makeField('number', 'tarifa')], 'g'),
  ]

  it('los campos del grupo y el grupo de un campo', () => {
    expect(groupFields(rows, 'g').map((field) => field.name)).toEqual(['ingresos', 'tarifa'])
    expect(findGroupIdForField(rows, 'id-tarifa')).toBe('g')
    expect(findGroupIdForField(rows, 'id-suelto')).toBeUndefined()
  })

  it('findGroupById y groupNamesInUse', () => {
    const step: FormStep = makeStep('Paso', rows, [makeGroup('a', { id: 'g' })])

    expect(findGroupById(step, 'g')?.name).toBe('a')
    expect(findGroupById(step, undefined)).toBeUndefined()
    expect([...groupNamesInUse([step, makeStep('Otro', [], [makeGroup('b')])])]).toEqual(['a', 'b'])
  })
})

describe('mantener la banda junta', () => {
  it('normalizeGroupRows junta las filas de cada grupo donde está la primera', () => {
    const rows: CanvasRow[] = [
      { id: 'g1', columns: 16, fields: [], groupId: 'g' },
      { id: 'a', columns: 16, fields: [] },
      { id: 'g2', columns: 16, fields: [], groupId: 'g' },
    ]

    expect(normalizeGroupRows(rows).map((row) => row.id)).toEqual(['g1', 'g2', 'a'])
  })

  it('un grupo sin filas se borra; si todos siguen vivos, el mismo paso', () => {
    const step: FormStep = makeStep(
      'Paso',
      [makeRow([makeField('number', 'x')], 'grupo-vivo')],
      [makeGroup('vivo'), makeGroup('muerto')],
    )

    expect(pruneEmptyGroups(step).groups?.map((group) => group.name)).toEqual(['vivo'])
    expect(pruneEmptyGroups(pruneEmptyGroups(step))).toEqual(pruneEmptyGroups(step))

    const alive: FormStep = makeStep(
      'Paso',
      [makeRow([makeField('number', 'x')], 'grupo-vivo')],
      [makeGroup('vivo')],
    )
    expect(pruneEmptyGroups(alive)).toBe(alive)
  })

  it('detachGroup suelta las filas y borra el grupo', () => {
    const step: FormStep = makeStep(
      'Paso',
      [makeRow([makeField('number', 'x')], 'grupo-g')],
      [makeGroup('g')],
    )
    const detached: FormStep = detachGroup(step, 'grupo-g')

    expect(detached.rows[0].groupId).toBeUndefined()
    expect(detached.groups).toBeUndefined()
    expect(detachGroup(step, 'otro')).toBe(step)
  })
})

describe('comprobaciones de grupo', () => {
  it('nace encendida y vacía', () => {
    expect(createGroupCheck()).toMatchObject({ label: '', enabled: true, script: '', message: '' })
  })

  it('solo cuentan las encendidas con script', () => {
    const checks: GroupCheck[] = [
      { id: '1', label: 'a', enabled: true, script: 'return true;', message: '' },
      { id: '2', label: 'b', enabled: false, script: 'return true;', message: '' },
      { id: '3', label: 'c', enabled: true, script: '   ', message: '' },
    ]

    expect(enabledChecks(checks).map((check) => check.id)).toEqual(['1'])
    expect(enabledChecks(undefined)).toEqual([])
  })
})
