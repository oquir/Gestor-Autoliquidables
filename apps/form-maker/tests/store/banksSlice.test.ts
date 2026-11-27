import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { CATALOG_BANK_KEY } from '../../src/lib/catalogBank/catalogBank.constants'
import { MAX_DATES_KEY } from '../../src/lib/maxDatesBank/maxDatesBank.constants'
import { VALORES_KEY } from '../../src/lib/valoresBank/valoresBank.constants'
import type { FechasMaximasPresentacion, FormState } from '../../src/types'
import { installMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage'

// Los tres bancos del simulador viven en el mismo store y guardan cada cambio en localStorage: un
// banco sobrevive a descartar el borrador.
const storage: MemoryStorage = installMemoryStorage()
storage.setItem(
  CATALOG_BANK_KEY,
  JSON.stringify({ tipos: { source: 'custom', entries: [{ id: '1', label: 'Guardado' }] } }),
)
// Modulo nuevo: sin aislamiento entre archivos (isolate: false) el store ya cargado no relee el
// localStorage de esta prueba.
vi.resetModules()
const { useFormStore } = await import('../../src/store/formStore')

const INITIAL: FormState = useFormStore.getState()

function state(): FormState {
  return useFormStore.getState()
}

function stored(key: string): unknown {
  return JSON.parse(storage.getItem(key) ?? 'null')
}

const FECHAS: FechasMaximasPresentacion = {
  municipioId: 1,
  ica: [],
  reteica: [],
  autoretencionIca: [],
}

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  useFormStore.setState(INITIAL, true)
})

describe('bancos del simulador', () => {
  it('al crear el store se leen de localStorage', () => {
    expect(INITIAL.catalogBank).toEqual({
      tipos: { source: 'custom', entries: [{ id: '1', label: 'Guardado' }] },
    })
  })

  it('cargar un catálogo lo deja en uso y lo guarda', () => {
    state().setCatalogEntries('municipios', [{ id: '5', label: 'Medellín' }])

    expect(state().catalogBank.municipios).toEqual({
      source: 'custom',
      entries: [{ id: '5', label: 'Medellín' }],
    })
    expect(stored(CATALOG_BANK_KEY)).toEqual(state().catalogBank)
  })

  it('volver a default conserva lo cargado; borrarlo lo quita', () => {
    state().setCatalogEntries('municipios', [{ id: '5', label: 'Medellín' }])
    state().setCatalogSource('municipios', 'default')

    expect(state().catalogBank.municipios.entries).toHaveLength(1)
    expect(state().catalogBank.municipios.source).toBe('default')

    state().clearCatalogEntries('municipios')
    expect(state().catalogBank.municipios).toBeUndefined()
    expect(stored(CATALOG_BANK_KEY)).toEqual(state().catalogBank)
  })

  it('cambiar el origen de un catálogo que no existe no hace nada', () => {
    const before: FormState = state()
    state().setCatalogSource('nada', 'custom')

    expect(state()).toBe(before)
  })

  it('fechas: cargar la deja en uso; null vuelve a la generada sin tirarla', () => {
    state().setMaxDates(FECHAS)
    expect(state().maxDates).toEqual({ source: 'custom', custom: FECHAS })

    state().setMaxDates(null)
    expect(state().maxDates).toEqual({ source: 'default', custom: FECHAS })
    state().setMaxDatesSource('custom')
    expect(stored(MAX_DATES_KEY)).toEqual({ source: 'custom', custom: FECHAS })
  })

  it('UVT y salario mínimo, igual', () => {
    const lista = [{ anio: 2027, uvt: 55000, smmlv: 1900000 }]
    state().setValores(lista)
    state().setValores(null)

    expect(state().valores).toEqual({ source: 'default', custom: lista })
    state().setValoresSource('custom')
    expect(stored(VALORES_KEY)).toEqual({ source: 'custom', custom: lista })
  })
})
