import { describe, expect, it } from 'vitest'
import {
  backEntryState,
  closeBackLayer,
  openBackLayer,
  popBackLayers,
  readBackDepth,
} from '../../src/lib/backStack/backStack'

// Atras de Android (B8 de docs/Plan-Movil.md): cada capa abierta deja una entrada con su piso, y
// popstate trae el piso al que se volvio.

describe('openBackLayer', () => {
  it('apila las capas en el orden en que se abren', () => {
    expect(openBackLayer(openBackLayer([], 'sim'), 'hoja')).toEqual(['sim', 'hoja'])
  })

  it('no repite una capa que ya esta abierta', () => {
    expect(openBackLayer(['sim'], 'sim')).toEqual(['sim'])
  })

  it('no muta la pila que recibe', () => {
    const stack: string[] = ['sim']
    openBackLayer(stack, 'hoja')
    expect(stack).toEqual(['sim'])
  })
})

describe('closeBackLayer', () => {
  it('cerrar desde la interfaz saca la capa y pide gastar su entrada', () => {
    expect(closeBackLayer(['sim', 'hoja'], 'hoja')).toEqual({ stack: ['sim'], goBack: true })
  })

  it('cerrar una del medio tambien gasta una entrada: los pisos son posiciones', () => {
    expect(closeBackLayer(['a', 'b', 'c'], 'b')).toEqual({ stack: ['a', 'c'], goBack: true })
  })

  it('una capa que ya cerro el Atras no vuelve a retroceder', () => {
    expect(closeBackLayer(['sim'], 'hoja')).toEqual({ stack: ['sim'], goBack: false })
  })
})

describe('popBackLayers', () => {
  it('Atras desde la hoja cierra solo la hoja', () => {
    expect(popBackLayers(['sim', 'hoja'], 1)).toEqual({ stack: ['sim'], closing: ['hoja'] })
  })

  it('volver varios pisos de una vez cierra de arriba hacia abajo', () => {
    expect(popBackLayers(['a', 'b', 'c'], 0)).toEqual({ stack: [], closing: ['c', 'b', 'a'] })
  })

  it('el popstate de un history.back propio no cierra nada', () => {
    // Se cerro la hoja desde la X: la pila ya tiene un piso y llega el piso 1.
    expect(popBackLayers(['sim'], 1)).toEqual({ stack: ['sim'], closing: [] })
  })

  it('se corrige solo si otra capa se abrio antes de que llegara ese popstate', () => {
    // [sim, hoja] -> X en la hoja (back pendiente) -> se abre un modal -> llega el piso 2.
    const closed = closeBackLayer(['sim', 'hoja'], 'hoja')
    const opened: string[] = openBackLayer(closed.stack, 'modal')
    expect(popBackLayers(opened, 2)).toEqual({ stack: ['sim', 'modal'], closing: [] })
  })

  it('un piso mayor que la pila (entrada vieja tras recargar) no cierra nada', () => {
    expect(popBackLayers(['sim'], 5)).toEqual({ stack: ['sim'], closing: [] })
  })
})

describe('readBackDepth', () => {
  it('lee el piso que guardo backEntryState', () => {
    expect(readBackDepth(backEntryState(3))).toBe(3)
  })

  it('una entrada ajena es el piso 0', () => {
    for (const state of [null, undefined, 'x', 7, {}, { otro: 1 }]) {
      expect(readBackDepth(state)).toBe(0)
    }
  })

  it('descarta pisos invalidos y redondea hacia abajo', () => {
    expect(readBackDepth({ formMakerBackDepth: -2 })).toBe(0)
    expect(readBackDepth({ formMakerBackDepth: Number.NaN })).toBe(0)
    expect(readBackDepth({ formMakerBackDepth: '2' })).toBe(0)
    expect(readBackDepth({ formMakerBackDepth: 2.7 })).toBe(2)
  })
})
