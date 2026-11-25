import { describe, expect, it } from 'vitest'
import { OPERATORS_WITHOUT_VALUE } from '../../src/lib/fieldCondition/fieldCondition.constants'
import {
  operatorIsStringBased,
  operatorNeedsValue,
  operatorsForField,
  operatorsForFieldType,
  operatorTakesList,
  parseConditionList,
} from '../../src/lib/fieldCondition/fieldCondition'
import { FIELD_TYPES } from '../../src/constants/fieldTypes'
import type { ConditionOperator } from '../../src/types'

describe('qué pide cada operador', () => {
  it('los de vacío y verdad no piden valor; los demás sí', () => {
    expect(OPERATORS_WITHOUT_VALUE).toEqual(['isEmpty', 'isNotEmpty', 'isTruthy', 'isFalsy'])
    expect(operatorNeedsValue('isEmpty')).toBe(false)
    expect(operatorNeedsValue('equals')).toBe(true)
  })

  it('solo in toma una lista; los de texto se marcan', () => {
    expect(operatorTakesList('in')).toBe(true)
    expect(operatorTakesList('contains')).toBe(false)
    expect(operatorIsStringBased('startsWith')).toBe(true)
    expect(operatorIsStringBased('greaterThan')).toBe(false)
  })

  it('parseConditionList parte por comas y recorta', () => {
    expect(parseConditionList(' 1, 2 ,,3 ')).toEqual(['1', '2', '3'])
    expect(parseConditionList(7)).toEqual(['7'])
    expect(parseConditionList(undefined)).toEqual([])
  })
})

describe('operadores por tipo de campo', () => {
  it('la casilla solo pregunta por verdad', () => {
    expect(operatorsForFieldType('checkbox')).toEqual(['isTruthy', 'isFalsy'])
  })

  it('la fecha no ofrece mayor ni menor: AAAA-MM-DD como número es NaN', () => {
    const operators: ConditionOperator[] = operatorsForFieldType('date')

    expect(operators).not.toContain('greaterThan')
    expect(operators).not.toContain('lessThan')
  })

  it('un rango de fechas es un objeto: solo si está lleno', () => {
    expect(operatorsForField({ type: 'date', dateRange: true })).toEqual(['isEmpty', 'isNotEmpty'])
    expect(operatorsForField({ type: 'date' })).toContain('equals')
  })

  it('las listas comparan por id; el grupo de casillas pregunta si contiene', () => {
    expect(operatorsForFieldType('select')).toEqual([
      'equals',
      'notEquals',
      'in',
      'isEmpty',
      'isNotEmpty',
    ])
    expect(operatorsForFieldType('checkbox_group')).toEqual(['contains', 'isEmpty', 'isNotEmpty'])
    expect(operatorsForFieldType('file')).toEqual(['isEmpty', 'isNotEmpty'])
  })

  it('todo tipo de la paleta tiene al menos un operador', () => {
    for (const { type } of FIELD_TYPES) {
      expect(operatorsForFieldType(type).length).toBeGreaterThan(0)
    }
  })
})
