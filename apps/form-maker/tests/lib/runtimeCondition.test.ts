import { describe, expect, it } from 'vitest'
import type { ConditionOperator, ExportedCondition, RuntimeValues } from '../../src/types'
import {
  evaluateCondition,
  evaluateConditions,
} from '../../src/lib/runtimeCondition/runtimeCondition'
import {
  isEmptyValue,
  isTruthyValue,
  looseEquals,
  toConditionList,
} from '../../src/lib/runtimeCondition/runtimeCondition.utils'

function check(operator: ConditionOperator, observed: unknown, value?: unknown): boolean {
  const condition = { field: 'x', operator, value } as ExportedCondition

  return evaluateCondition(condition, { x: observed })
}

describe('evaluateCondition: los 13 operadores', () => {
  it('sin condición, true: se ve y se edita', () => {
    expect(evaluateCondition(undefined, {})).toBe(true)
  })

  it('isEmpty e isNotEmpty: vacío es undefined, null, texto en blanco o lista vacía', () => {
    for (const empty of [undefined, null, '', '   ', []]) {
      expect(check('isEmpty', empty)).toBe(true)
      expect(check('isNotEmpty', empty)).toBe(false)
    }
    for (const filled of [0, false, 'a', ['1']]) {
      expect(check('isEmpty', filled)).toBe(false)
      expect(check('isNotEmpty', filled)).toBe(true)
    }
  })

  it('isTruthy e isFalsy: "false" y "0" como texto son falsos', () => {
    expect(check('isTruthy', true)).toBe(true)
    expect(check('isTruthy', 'si')).toBe(true)
    expect(check('isTruthy', ['a'])).toBe(true)
    expect(check('isTruthy', 1)).toBe(true)
    for (const falsy of [false, 'false', '0', '', 0, [], undefined, null]) {
      expect(check('isTruthy', falsy)).toBe(false)
      expect(check('isFalsy', falsy)).toBe(true)
    }
  })

  it('equals y notEquals comparan como texto: el 1 del catálogo es el "1" de la condición', () => {
    expect(check('equals', 1, '1')).toBe(true)
    expect(check('equals', '2', '1')).toBe(false)
    expect(check('equals', undefined, '')).toBe(true)
    expect(check('notEquals', 1, '1')).toBe(false)
    expect(check('notEquals', 'a', 'b')).toBe(true)
  })

  it('equals con booleanos compara por verdad', () => {
    expect(check('equals', true, 'true')).toBe(true)
    expect(check('equals', 'false', false)).toBe(true)
    expect(check('equals', 1, true)).toBe(true)
    expect(check('equals', '', true)).toBe(false)
  })

  it('greaterThan y lessThan comparan como número; lo ilegible vale 0', () => {
    expect(check('greaterThan', '1500', 1000)).toBe(true)
    expect(check('greaterThan', 1000, '1000')).toBe(false)
    expect(check('lessThan', -1, 0)).toBe(true)
    expect(check('lessThan', 'abc', 1)).toBe(true)
    expect(check('greaterThan', undefined, -1)).toBe(true)
  })

  it('startsWith y endsWith sobre el texto', () => {
    expect(check('startsWith', '900123456', '900')).toBe(true)
    expect(check('startsWith', 900123456, '123')).toBe(false)
    expect(check('endsWith', 'archivo.pdf', '.pdf')).toBe(true)
    expect(check('endsWith', undefined, 'x')).toBe(false)
  })

  it('contains busca en el texto o en la lista de un multiselección', () => {
    expect(check('contains', 'industria y comercio', 'comercio')).toBe(true)
    expect(check('contains', ['1', '3'], '3')).toBe(true)
    expect(check('contains', [1, 3], '3')).toBe(true)
    expect(check('contains', ['13'], '3')).toBe(false)
  })

  it('in acepta una lista separada por comas, con espacios', () => {
    expect(check('in', '2', '1, 2,3')).toBe(true)
    expect(check('in', 4, '1,2,3')).toBe(false)
    expect(check('in', '1', ['1', '2'])).toBe(true)
    expect(check('in', '', '')).toBe(false)
  })

  it('matches con una expresión; una inválida no coincide y una vacía sí', () => {
    expect(check('matches', '900123456', '^9\\d{8}$')).toBe(true)
    expect(check('matches', '80012345', '^9')).toBe(false)
    expect(check('matches', 'x', '(')).toBe(false)
    expect(check('matches', 'x', '')).toBe(true)
  })
})

describe('evaluateConditions', () => {
  const values: RuntimeValues = { a: '1', b: '' }
  const isA: ExportedCondition = { field: 'a', operator: 'equals', value: '1' }
  const bFilled: ExportedCondition = { field: 'b', operator: 'isNotEmpty' }

  it('matchAll pide todas; si no, alcanza una', () => {
    expect(evaluateConditions([isA, bFilled], values, true)).toBe(false)
    expect(evaluateConditions([isA, bFilled], values, false)).toBe(true)
  })

  it('sin condiciones, true', () => {
    expect(evaluateConditions([], values, true)).toBe(true)
    expect(evaluateConditions([], values, false)).toBe(true)
  })
})

describe('utilidades', () => {
  it('isEmptyValue, isTruthyValue y looseEquals', () => {
    expect(isEmptyValue(0)).toBe(false)
    expect(isTruthyValue('0')).toBe(false)
    expect(looseEquals(null, undefined)).toBe(true)
  })

  it('toConditionList descarta entradas vacías', () => {
    expect(toConditionList(' a, ,b ,')).toEqual(['a', 'b'])
    expect(toConditionList(undefined)).toEqual([])
    expect(toConditionList([1, 2])).toEqual(['1', '2'])
  })
})
