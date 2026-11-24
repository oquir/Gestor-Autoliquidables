import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VALORES_POR_DEFECTO } from '../../src/constants/valoresAnuales'
import {
  catalogEntriesFor,
  loadCatalogBank,
  parseCatalogPaste,
  saveCatalogBank,
  usesCustomCatalog,
} from '../../src/lib/catalogBank/catalogBank'
import { CATALOG_BANK_KEY } from '../../src/lib/catalogBank/catalogBank.constants'
import { fillsColumn, hasFills, resolveFills } from '../../src/lib/catalogFill/catalogFill'
import {
  loadMaxDates,
  maxDatesEnUso,
  parseMaxDatesPaste,
  saveMaxDates,
  usesCustomMaxDates,
} from '../../src/lib/maxDatesBank/maxDatesBank'
import {
  loadValores,
  parseValoresPaste,
  saveValores,
  valoresEnUso,
} from '../../src/lib/valoresBank/valoresBank'
import type {
  CatalogBank,
  CatalogOption,
  ExportedField,
  FechasMaximasPresentacion,
} from '../../src/types'
import { installMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage'

// Los tres bancos del simulador (catalogos, fechas maximas, UVT y salario minimo): se llenan
// pegando la respuesta de un endpoint y viven en localStorage, fuera del borrador y del export.

let storage: MemoryStorage

beforeEach(() => {
  storage = installMemoryStorage()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('catálogos', () => {
  const keys = { id: 'idMunicipio', label: 'nombre', parent: 'idDepartamento' }

  it('lee la lista aunque venga dentro de un objeto', () => {
    const raw: string = JSON.stringify({
      data: [
        { idMunicipio: 1, nombre: 'Medellín', idDepartamento: 5 },
        { idMunicipio: 2, nombre: 'Envigado', idDepartamento: 5 },
      ],
    })

    expect(parseCatalogPaste(raw, keys)).toEqual({
      entries: [
        { id: '1', label: 'Medellín', parentId: '5' },
        { id: '2', label: 'Envigado', parentId: '5' },
      ],
      error: null,
    })
  })

  it('un id repetido deja la primera fila; sin rótulo usa el id', () => {
    const raw: string = JSON.stringify([
      { idMunicipio: 1, nombre: 'A' },
      { idMunicipio: 1, nombre: 'B' },
      { idMunicipio: 3 },
    ])

    expect(parseCatalogPaste(raw, keys).entries).toEqual([
      { id: '1', label: 'A' },
      { id: '3', label: '3' },
    ])
  })

  it('la tarifa con coma decimal se lee; una que no es número se descarta', () => {
    const raw: string = JSON.stringify([
      { id: 1, ciiu: '4711', tarifa: '7,5' },
      { id: 2, ciiu: '5611', tarifa: 'n/a' },
    ])

    expect(
      parseCatalogPaste(raw, { id: 'id', label: 'ciiu', code: 'ciiu', tarifa: 'tarifa' }).entries,
    ).toEqual([
      { id: '1', label: '4711', code: '4711', tarifa: 7.5 },
      { id: '2', label: '5611', code: '5611' },
    ])
  })

  it('cada error con su motivo', () => {
    expect(parseCatalogPaste('  ', keys).error).toBe('Pegá la respuesta del endpoint.')
    expect(parseCatalogPaste('{x', keys).error).toBe('No es JSON válido.')
    expect(parseCatalogPaste('{"a": 1}', keys).error).toBe(
      'No encontré ninguna lista dentro del JSON.',
    )
    expect(parseCatalogPaste('[{"otro": 1}]', keys).error).toBe(
      'Ningún elemento traía el campo “idMunicipio”.',
    )
  })

  it('el banco usa lo cargado solo si está en custom y no vacío; filtra por padre', () => {
    const bank: CatalogBank = {
      municipios: {
        source: 'custom',
        entries: [
          { id: '1', label: 'A', parentId: '5' },
          { id: '2', label: 'B', parentId: '8' },
        ],
      },
      vacio: { source: 'custom', entries: [] },
      apagado: { source: 'default', entries: [{ id: '1', label: 'A' }] },
    }

    expect(usesCustomCatalog(bank, 'municipios')).toBe(true)
    expect(usesCustomCatalog(bank, 'vacio')).toBe(false)
    expect(usesCustomCatalog(bank, 'apagado')).toBe(false)
    expect(catalogEntriesFor(bank, 'municipios', '8').map((entry) => entry.id)).toEqual(['2'])
  })

  it('se guarda y se lee de localStorage; uno roto da el banco vacío', () => {
    const bank: CatalogBank = { tipos: { source: 'custom', entries: [{ id: '1', label: 'A' }] } }
    saveCatalogBank(bank)

    expect(loadCatalogBank()).toEqual(bank)

    storage.setItem(CATALOG_BANK_KEY, '{roto')
    expect(loadCatalogBank()).toEqual({})
  })
})

describe('rellenos desde el catálogo', () => {
  const field = {
    dataSource: {
      catalog: 'actividades',
      fills: [
        { column: 'code', field: 'codigo_actividad' },
        { column: 'tarifa', field: 'tarifa_x_mil' },
      ],
    },
  } as ExportedField
  const options: CatalogOption[] = [
    { id: '10', label: 'Comercio', code: '4711', tarifa: 7 },
    { id: '20', label: 'Servicios', code: '9609' },
  ]

  it('copia las columnas de la opción elegida', () => {
    expect(hasFills(field)).toBe(true)
    expect(fillsColumn(field, 'tarifa')).toBe(true)
    expect(fillsColumn(field, 'label')).toBe(false)
    expect(resolveFills(field, 10, options)).toEqual({ codigo_actividad: '4711', tarifa_x_mil: 7 })
  })

  it('sin opción o sin esa columna, vacía el destino en vez de dejar el valor anterior', () => {
    expect(resolveFills(field, '20', options)).toEqual({
      codigo_actividad: '9609',
      tarifa_x_mil: '',
    })
    expect(resolveFills(field, '', options)).toEqual({ codigo_actividad: '', tarifa_x_mil: '' })
    expect(resolveFills({} as ExportedField, '10', options)).toEqual({})
  })
})

describe('fechas máximas', () => {
  const fechas: FechasMaximasPresentacion = {
    municipioId: 5001,
    ica: [
      {
        anio: 2025,
        periodicidad: 'anual',
        tipoDigito: 'ninguno',
        fechas: [{ periodo: 1, fecha: '2026/04/15' }],
      },
      {
        anio: 2025,
        periodicidad: 'anual',
        tipoDigito: 'ninguno',
        fechas: [{ periodo: 1, fecha: '2026/05/15' }],
      },
    ],
    reteica: [],
    autoretencionIca: [],
  }

  it('lee el objeto entero o envuelto, y deja una regla por año', () => {
    const parsed = parseMaxDatesPaste(JSON.stringify({ success: true, result: fechas }))

    expect(parsed.error).toBeNull()
    expect(parsed.fechas?.ica).toHaveLength(1)
    expect(parsed.fechas?.ica[0].fechas[0].fecha).toBe('2026/04/15')
  })

  it('sin la forma esperada lo dice', () => {
    expect(parseMaxDatesPaste('{"ica": []}').error).toBe(
      'El JSON no tiene la forma esperada: municipioId, ica, reteica y autoretencionIca.',
    )
    expect(parseMaxDatesPaste('').error).toBe('Pegá la respuesta del endpoint.')
  })

  it('cargada manda; en default se genera la de fábrica del año', () => {
    expect(usesCustomMaxDates({ source: 'custom', custom: fechas })).toBe(true)
    expect(maxDatesEnUso({ source: 'custom', custom: fechas }, 2026)).toBe(fechas)
    expect(maxDatesEnUso({ source: 'default', custom: fechas }, 2026).ica).toHaveLength(10)
  })

  it('se guarda y se lee; sin nada guardado es la de fábrica', () => {
    expect(loadMaxDates()).toEqual({ source: 'default', custom: null })

    saveMaxDates({ source: 'custom', custom: fechas })
    expect(loadMaxDates().custom?.municipioId).toBe(5001)
  })
})

describe('UVT y salario mínimo', () => {
  const keys = { anio: 'anio', uvt: 'valorUvt', smmlv: 'salario' }

  it('lee números o textos con separadores, del más nuevo al más viejo', () => {
    const raw: string = JSON.stringify({
      data: [
        { anio: 2025, valorUvt: '49799', salario: '1.423.500' },
        { anio: '2026', valorUvt: 52374, salario: 1750905 },
      ],
    })

    expect(parseValoresPaste(raw, keys)).toEqual({
      valores: [
        { anio: 2026, uvt: 52374, smmlv: 1750905 },
        { anio: 2025, uvt: 49799, smmlv: 1423500 },
      ],
      error: null,
    })
  })

  it('"52374.00" no se lee como 5237400: la lectura directa va primero', () => {
    const raw: string = JSON.stringify([{ anio: 2026, valorUvt: '52374.00', salario: 1 }])

    expect(parseValoresPaste(raw, keys).valores?.[0].uvt).toBe(52374)
  })

  // RIESGO (decision vigente, ver Decisiones.md "leerNumero"): un solo punto seguido de tres
  // digitos se lee como decimal. "49.799" con punto de miles queda en 49,799 pesos y la sancion
  // minima de 10 UVT en ~498. Esta prueba fija lo que hace hoy; si se cambia la regla, se cambia
  // aca a proposito.
  it('un solo punto de miles se lee como decimal: "49.799" da 49,799', () => {
    const raw: string = JSON.stringify([{ anio: 2025, valorUvt: '49.799', salario: 1 }])

    expect(parseValoresPaste(raw, keys).valores?.[0].uvt).toBe(49.799)
  })

  it('una fila incompleta se descarta y un año repetido deja el primero', () => {
    const raw: string = JSON.stringify([
      { anio: 2026, valorUvt: 1, salario: 1 },
      { anio: 2026, valorUvt: 2, salario: 2 },
      { anio: 2025, valorUvt: 3 },
    ])

    expect(parseValoresPaste(raw, keys).valores).toEqual([{ anio: 2026, uvt: 1, smmlv: 1 }])
  })

  it('sin filas útiles lo dice', () => {
    expect(parseValoresPaste('[]', keys).error).toBe(
      'Ninguna fila trajo anio, valorUvt y salario con valores numéricos.',
    )
  })

  it('en default usa la tabla de fábrica; guardado y leído', () => {
    expect(valoresEnUso({ source: 'default', custom: null })).toBe(VALORES_POR_DEFECTO)
    expect(loadValores()).toEqual({ source: 'default', custom: null })

    const custom = [{ anio: 2027, uvt: 55000, smmlv: 1900000 }]
    saveValores({ source: 'custom', custom })
    expect(valoresEnUso(loadValores())).toEqual(custom)
  })
})
