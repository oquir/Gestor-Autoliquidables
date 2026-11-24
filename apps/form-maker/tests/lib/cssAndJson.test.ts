import { describe, expect, it } from 'vitest'
import {
  parseCssText,
  resolveFieldStyles,
  resolveRowStyles,
} from '../../src/lib/cssStyles/cssStyles'
import {
  buildJsonModel,
  buildJsonSearchIndex,
  computeVisibleRows,
  expandToLine,
  findJsonMatches,
  groupHighlightsByLine,
  longestRowLength,
  tokenizeJson,
} from '../../src/lib/jsonCode/jsonCode'
import type { JsonModel } from '../../src/types'

describe('estilos en CSS plano', () => {
  it('pasa el texto a camelCase y deja las variables tal cual', () => {
    expect(
      parseCssText('font-weight: 700; /* nota */ --mi-color: red; background: url(http://x.png)'),
    ).toEqual({ fontWeight: '700', '--mi-color': 'red', background: 'url(http://x.png)' })
  })

  it('descarta declaraciones rotas', () => {
    expect(parseCssText(': red; color: ; ; margin-top: 4px')).toEqual({ marginTop: '4px' })
  })

  it('el texto libre gana a los atajos del panel', () => {
    expect(
      resolveFieldStyles({ marginTop: '8px', textColor: 'blue', customCss: 'color: red' }),
    ).toEqual({ marginTop: '8px', color: 'red' })
  })

  it('una fila sin estilos no lleva la clave', () => {
    expect(resolveRowStyles(undefined)).toBeUndefined()
    expect(resolveRowStyles({ customCss: '  ' })).toBeUndefined()
    expect(resolveRowStyles({ marginBottom: '2px' })).toEqual({ marginBottom: '2px' })
  })
})

describe('vista JSON', () => {
  const json: string = JSON.stringify(
    { nombre: 'Ana', monto: 12.5, activo: true, nada: null, lista: [1, 2] },
    null,
    2,
  )
  const model: JsonModel = buildJsonModel(json)

  it('distingue claves de textos, números, booleanos y null', () => {
    const kinds = tokenizeJson('{"a": "b", "c": -1.5e2, "d": false, "e": null}')
      .filter((segment) => typeof segment !== 'string')
      .map((segment) => (typeof segment === 'string' ? '' : segment.kind))

    expect(kinds).toEqual(['key', 'string', 'key', 'number', 'key', 'boolean', 'key', 'null'])
  })

  it('cada línea que abre sabe dónde cierra', () => {
    expect(model.lines[0].opensContainer).toBe(true)
    expect(model.lines[0].closeIndex).toBe(model.lines.length - 1)
    const lista: number = model.lines.findIndex((line) => line.text.includes('"lista"'))
    expect(model.lines[lista].openChar).toBe('[')
    expect(model.lines[model.lines[lista].closeIndex].text.trim()).toBe(']')
  })

  it('plegar esconde el contenido y deja el cierre en la misma fila', () => {
    const lista: number = model.lines.findIndex((line) => line.text.includes('"lista"'))
    const rows = computeVisibleRows(model, new Set([lista]))
    const folded = rows.find((row) => row.lineIndex === lista)

    expect(rows).toHaveLength(model.lines.length - 3)
    expect(folded?.isCollapsed).toBe(true)
    expect(folded?.closeChar).toBe(']')
    expect(longestRowLength(model, rows)).toBeGreaterThan(0)
  })

  it('la búsqueda ignora mayúsculas y tildes y no se solapa', () => {
    const index: string[] = buildJsonSearchIndex(buildJsonModel('{\n  "a": "Ánaaaa"\n}'))

    expect(findJsonMatches(index, 'ANA')).toEqual([{ line: 1, start: 6, end: 9 }])
    expect(findJsonMatches(index, 'aa')).toHaveLength(2)
    expect(findJsonMatches(index, '')).toEqual([])
  })

  it('ir a un resultado abre lo plegado que lo tapa, y solo eso', () => {
    const lista: number = model.lines.findIndex((line) => line.text.includes('"lista"'))
    const collapsed: Set<number> = new Set([0, lista])

    expect([...expandToLine(model, collapsed, lista + 1)]).toEqual([])
    expect(expandToLine(model, new Set([lista]), 1)).toEqual(new Set([lista]))
    const untouched: Set<number> = new Set([lista])
    expect(expandToLine(model, untouched, 1)).toBe(untouched)
  })

  it('los resaltados se agrupan por línea y marcan el actual', () => {
    const byLine = groupHighlightsByLine(
      [
        { line: 1, start: 0, end: 2 },
        { line: 1, start: 4, end: 6 },
        { line: 3, start: 0, end: 1 },
      ],
      1,
    )

    expect(byLine.get(1)).toEqual([
      { start: 0, end: 2, current: false },
      { start: 4, end: 6, current: true },
    ])
    expect(byLine.get(3)).toHaveLength(1)
  })
})
