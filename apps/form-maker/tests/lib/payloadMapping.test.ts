import { describe, expect, it } from 'vitest'
import { PAYLOAD_SCHEMA } from '../../src/constants/payloadSchema'
import {
  buildMappingTree,
  fieldMatchesLeaf,
  findOrphanBindings,
  summarizeConcepts,
  toPlainSummary,
} from '../../src/lib/payloadMapping/payloadMapping'
import { fieldMatchesSchemaType } from '../../src/lib/payloadMapping/payloadMapping.utils'
import {
  arrayPaths,
  flattenLeaves,
  flattenSelectableLeaves,
  resolveLeaf,
  resolveLeafType,
} from '../../src/lib/payloadSchema/payloadSchema'
import type { SchemaNode } from '../../src/types'
import { makeField } from '../helpers/canvasFixtures'

const SCHEMA: SchemaNode = {
  key: 'root',
  type: 'object',
  children: [
    { key: 'periodoAnio', type: 'number' },
    { key: 'radicado', type: 'number', providedByHost: true },
    {
      key: 'contribuyente',
      type: 'object',
      children: [{ key: 'nombre', type: 'string' }],
    },
    {
      key: 'actividades',
      type: 'array',
      items: {
        key: 'actividad',
        type: 'object',
        children: [{ key: 'ingreso', type: 'number' }],
      },
    },
  ],
}

describe('el contrato', () => {
  it('aplana las hojas con su ruta; las de un array con []', () => {
    expect(flattenLeaves(SCHEMA).map((leaf) => leaf.path)).toEqual([
      'periodoAnio',
      'radicado',
      'contribuyente.nombre',
      'actividades[].ingreso',
    ])
    expect(arrayPaths(SCHEMA)).toEqual(['actividades'])
  })

  it('solo se ofrecen las hojas del ámbito y nunca las del aplicativo', () => {
    expect(flattenSelectableLeaves(SCHEMA).map((leaf) => leaf.path)).toEqual([
      'periodoAnio',
      'contribuyente.nombre',
    ])
    expect(flattenSelectableLeaves(SCHEMA, 'actividades').map((leaf) => leaf.path)).toEqual([
      'actividades[].ingreso',
    ])
  })

  it('resuelve una ruta o da null', () => {
    expect(resolveLeafType(SCHEMA, 'contribuyente.nombre')).toBe('string')
    expect(resolveLeaf(SCHEMA, 'no.existe')).toBeNull()
  })

  it('el contrato real del ICA tiene las rutas que usa la plantilla', () => {
    for (const path of [
      'periodoAnio',
      'contribuyente.idTipoPersona',
      'actividades[].idActividad',
      'impuestoACargo.totalImpuestoACargo',
      'totalDeclaracion.interesMora',
    ]) {
      expect(resolveLeaf(PAYLOAD_SCHEMA, path)).not.toBeNull()
    }
  })
})

describe('tipos contra hojas', () => {
  it('un número va a hoja numérica; la casilla cuenta como número (0 o 1)', () => {
    expect(fieldMatchesSchemaType('number', 'number')).toBe(true)
    expect(fieldMatchesSchemaType('checkbox', 'number')).toBe(true)
    expect(fieldMatchesSchemaType('text', 'number')).toBe(false)
    expect(fieldMatchesSchemaType('calculated', 'string')).toBe(false)
  })

  it('un select contra una hoja numérica sigue avisando: hueco conocido', () => {
    expect(fieldMatchesSchemaType('select', 'number')).toBe(false)
  })

  it('un rango de fechas no entra en ninguna hoja escalar', () => {
    expect(fieldMatchesLeaf({ type: 'date', dateRange: true }, 'string')).toBe(false)
    expect(fieldMatchesLeaf({ type: 'date' }, 'string')).toBe(true)
  })
})

describe('el árbol de mapeo', () => {
  const fields = [
    makeField('number', 'anio', {
      label: 'Año',
      apiBinding: { kind: 'mapped', path: 'periodoAnio' },
    }),
    makeField('text', 'nombre', {
      label: 'Nombre',
      apiBinding: { kind: 'mapped', path: 'contribuyente.nombre' },
    }),
    makeField('text', 'rad', {
      label: 'Radicado',
      apiBinding: { kind: 'mapped', path: 'radicado' },
    }),
    makeField('text', 'huerfano', {
      label: 'Huérfano',
      apiBinding: { kind: 'mapped', path: 'viejo' },
    }),
  ]

  it('marca mapeados, sin mapear, del aplicativo y desajustes de tipo', () => {
    const tree = buildMappingTree(SCHEMA, [
      ...fields,
      makeField('text', 'mal', {
        label: 'Ingreso',
        apiBinding: { kind: 'mapped', path: 'actividades[].ingreso' },
      }),
    ])

    expect(toPlainSummary(tree)).toEqual({
      periodoAnio: '← Año',
      radicado: '⚠ lo define el aplicativo receptor (Radicado apunta acá)',
      contribuyente: { nombre: '← Nombre' },
      actividades: [{ ingreso: '← Ingreso (⚠ tipo)' }],
    })
  })

  it('sin mapear y sin conflicto', () => {
    expect(toPlainSummary(buildMappingTree(SCHEMA, []))).toEqual({
      periodoAnio: '— sin mapear —',
      radicado: '— lo define el aplicativo receptor —',
      contribuyente: { nombre: '— sin mapear —' },
      actividades: [{ ingreso: '— sin mapear —' }],
    })
  })

  it('findOrphanBindings encuentra las rutas que no existen', () => {
    expect(findOrphanBindings(SCHEMA, fields)).toEqual([
      { fieldId: 'id-huerfano', fieldLabel: 'Huérfano', path: 'viejo' },
    ])
  })

  it('summarizeConcepts avisa los que no tienen id o lo repiten', () => {
    expect(summarizeConcepts([])).toBe('— ninguno —')
    expect(
      summarizeConcepts([
        makeField('number', 'a', {
          label: 'Valor',
          apiBinding: { kind: 'concept', idConcepto: 3 },
        }),
        makeField('text', 'b', { label: '', apiBinding: { kind: 'concept' } }),
        makeField('text', 'c', { label: 'C', apiBinding: { kind: 'concept', idConcepto: 4 } }),
        makeField('text', 'd', { label: 'D', apiBinding: { kind: 'concept', idConcepto: 4 } }),
      ]),
    ).toEqual([
      '← Valor · idConcepto 3 · numero',
      '⚠ b · sin idConcepto',
      '⚠ C · idConcepto 4 repetido',
      '⚠ D · idConcepto 4 repetido',
    ])
  })
})
