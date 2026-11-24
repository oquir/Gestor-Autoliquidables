import { describe, expect, it } from 'vitest'
import { fieldId, makeField } from '../helpers/canvasFixtures'
import type { CanvasField, FieldGraph } from '../../src/types'
import {
  buildFieldGraph,
  describeCycle,
  findCycle,
  topologicalOrder,
  wouldCreateCycle,
} from '../../src/lib/fieldGraph/fieldGraph'

function script(name: string, source: string): CanvasField {
  return makeField('calculated', name, { logic: { script: source } })
}

describe('buildFieldGraph', () => {
  it('junta las cuatro fuentes de dependencias, por id y sin repetir', () => {
    const graph: FieldGraph = buildFieldGraph([
      makeField('number', 'a'),
      makeField('number', 'b'),
      makeField('number', 'c'),
      makeField('number', 'd'),
      makeField('number', 'x', {
        visibleWhen: { fieldId: fieldId('a'), operator: 'isTruthy' },
        enableWhen: { fieldId: fieldId('a'), operator: 'isTruthy' },
        logic: {
          script: 'return {{b}};',
          rules: [
            {
              id: 'r',
              matchAll: true,
              when: [{ id: 'w', fieldId: fieldId('c'), operator: 'isEmpty' }],
              effects: [{ id: 'e', kind: 'script', source: 'return {{d}} + {{b}};' }],
            },
          ],
        },
      }),
    ])

    expect(graph.edges.get(fieldId('x'))).toEqual([
      fieldId('a'),
      fieldId('c'),
      fieldId('b'),
      fieldId('d'),
    ])
  })

  it('una referencia a un campo borrado no deja un nodo fantasma', () => {
    const graph: FieldGraph = buildFieldGraph([
      makeField('number', 'x', { visibleWhen: { fieldId: 'id-borrado', operator: 'isTruthy' } }),
    ])

    expect(graph.edges.get(fieldId('x'))).toEqual([])
  })
})

describe('orden y ciclos', () => {
  it('topologicalOrder pone cada campo después de sus dependencias', () => {
    const graph: FieldGraph = buildFieldGraph([
      script('total', 'return {{sub}} * 2;'),
      script('sub', 'return {{precio}};'),
      makeField('number', 'precio'),
    ])
    const result = topologicalOrder(graph)

    expect(result.order).toEqual([fieldId('precio'), fieldId('sub'), fieldId('total')])
    expect(result.unresolved).toEqual([])
    expect(result.cycle).toBeNull()
  })

  it('con un ciclo, lo deja sin resolver y lo describe por nombre', () => {
    const graph: FieldGraph = buildFieldGraph([
      script('a', 'return {{b}};'),
      script('b', 'return {{c}};'),
      script('c', 'return {{a}};'),
      makeField('number', 'libre'),
    ])
    const result = topologicalOrder(graph)

    expect(result.order).toEqual([fieldId('libre')])
    expect(result.unresolved).toHaveLength(3)
    expect(result.cycle).not.toBeNull()
    expect(describeCycle(graph, findCycle(graph) ?? [])).toBe('a → b → c → a')
  })

  it('sin ciclo, findCycle da null', () => {
    expect(findCycle(buildFieldGraph([script('a', 'return 1;')]))).toBeNull()
  })

  it('wouldCreateCycle avisa antes de atar dos campos', () => {
    const graph: FieldGraph = buildFieldGraph([
      script('total', 'return {{sub}};'),
      script('sub', 'return {{precio}};'),
      makeField('number', 'precio'),
    ])

    // Que precio dependa de total cerraria precio -> total -> sub -> precio.
    expect(wouldCreateCycle(graph, fieldId('precio'), fieldId('total'))).toBe(true)
    expect(wouldCreateCycle(graph, fieldId('total'), fieldId('precio'))).toBe(false)
    expect(wouldCreateCycle(graph, fieldId('sub'), fieldId('sub'))).toBe(true)
  })
})
