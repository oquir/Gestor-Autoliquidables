import { describe, expect, it } from 'vitest'
import { emptyRichText, isEmptyRichText, serializeRichText } from '../../src/lib/richText/richText'
import { safeHref } from '../../src/lib/richText/richText.utils'
import type { DomLike } from '../../src/lib/richText/richText.types'
import type { RichTextContent } from '../../src/types'

// El serializador es el saneador: recorre un DOM y deja solo parrafos con texto y cuatro marcas.
// En node no hay DOM, asi que los nodos se arman a mano con la forma que lee.

function text(value: string): DomLike {
  return {
    nodeType: 3,
    nodeName: '#text',
    textContent: value,
    childNodes: [],
  } as unknown as DomLike
}

function el(
  tag: string,
  children: DomLike[] = [],
  attributes: Record<string, string> = {},
  style: Record<string, string> = {},
): DomLike {
  return {
    nodeType: 1,
    nodeName: tag,
    childNodes: children,
    style,
    getAttribute: (name: string) => attributes[name] ?? null,
  } as unknown as DomLike
}

function root(...children: DomLike[]): DomLike {
  return el('DIV', children)
}

describe('serializeRichText', () => {
  it('texto suelto es un párrafo; las marcas por etiqueta', () => {
    expect(
      serializeRichText(
        root(text('Hola '), el('B', [text('negrita')]), el('EM', [text(' y cursiva')])),
      ),
    ).toEqual([
      {
        type: 'paragraph',
        children: [
          { text: 'Hola ' },
          { text: 'negrita', bold: true },
          { text: ' y cursiva', italic: true },
        ],
      },
    ])
  })

  it('las marcas también salen de los estilos en línea (lo que pega Word)', () => {
    const content: RichTextContent = serializeRichText(
      root(el('SPAN', [text('Word')], {}, { fontWeight: '700', textDecorationLine: 'underline' })),
    )

    expect(content[0].children).toEqual([{ text: 'Word', bold: true, underline: true }])
  })

  it('cada bloque y cada salto de línea cierran un párrafo', () => {
    const content: RichTextContent = serializeRichText(
      root(el('P', [text('uno')]), el('P', [text('dos'), el('BR'), text('tres')])),
    )

    expect(
      content.map((paragraph) => paragraph.children.map((leaf) => leaf.text).join('')),
    ).toEqual(['uno', 'dos', 'tres'])
  })

  it('script, style e iframe se tiran enteros, con su contenido', () => {
    const content: RichTextContent = serializeRichText(
      root(
        text('visible'),
        el('SCRIPT', [text('alert(1)')]),
        el('STYLE', [text('body{}')]),
        el('IFRAME', [text('x')]),
      ),
    )

    expect(content).toEqual([{ type: 'paragraph', children: [{ text: 'visible' }] }])
  })

  it('un enlace peligroso pierde el href; uno sano lo conserva', () => {
    const content: RichTextContent = serializeRichText(
      root(
        el('A', [text('malo')], { href: 'javascript:alert(1)' }),
        el('A', [text('bueno')], { href: 'https://dian.gov.co' }),
      ),
    )

    expect(content[0].children).toEqual([
      { text: 'malo' },
      { text: 'bueno', href: 'https://dian.gov.co/' },
    ])
  })

  it('hojas con las mismas marcas se juntan; vacío da un párrafo vacío', () => {
    expect(serializeRichText(root(text('a'), text('b')))[0].children).toEqual([{ text: 'ab' }])
    expect(serializeRichText(root())).toEqual(emptyRichText())
  })
})

describe('safeHref', () => {
  it('solo http, https y mailto; sin protocolo se asume https', () => {
    expect(safeHref('https://a.co')).toBe('https://a.co/')
    expect(safeHref('mailto:ana@a.co')).toBe('mailto:ana@a.co')
    expect(safeHref('dian.gov.co')).toBe('https://dian.gov.co/')
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref('data:text/html,<b>')).toBeUndefined()
    expect(safeHref('  ')).toBeUndefined()
    expect(safeHref(null)).toBeUndefined()
  })

  // RIESGO (hallazgo 4.8 de docs/Hallazgos-Pruebas.md): sin protocolo se asume https, asi que un
  // correo escrito sin mailto: queda como enlace al host del correo. Fija lo que pasa hoy.
  it('un correo sin mailto: se vuelve un enlace https', () => {
    expect(safeHref('a@b.co')).toBe('https://a@b.co/')
  })
})

describe('isEmptyRichText', () => {
  it('vacío es sin párrafos o solo espacios', () => {
    expect(isEmptyRichText(undefined)).toBe(true)
    expect(isEmptyRichText([])).toBe(true)
    expect(isEmptyRichText([{ type: 'paragraph', children: [{ text: '  ' }] }])).toBe(true)
    expect(isEmptyRichText([{ type: 'paragraph', children: [{ text: 'x' }] }])).toBe(false)
  })
})
