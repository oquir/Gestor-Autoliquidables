import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { sanitizePdfHtml } from '../../src/lib/pdfHtml/pdfHtml'

// Pruebas por propiedades del saneo del HTML libre del PDF (ver numberFormat.props.test.ts):
// complementan pdfHtml.test.ts. Con texto al azar casi nunca sale una etiqueta completa, asi que
// el generador arma HTML con piezas: etiquetas permitidas y prohibidas, atributos con valores
// peligrosos, comillas de los tres tipos, bloques <style> y texto suelto.

// Mas corridas que el resto: el saneo es rapido y la combinacion que rompe es rara.
const RUNS: { numRuns: number } = { numRuns: 1000 }

const TAG_NAMES: string[] = [
  'td',
  'tr',
  'table',
  'b',
  'img',
  'a',
  'span',
  'font',
  'br',
  'TD',
  'Img',
  'script',
  'svg',
  'iframe',
  'textarea',
  'title',
]

const ATTRIBUTE_NAMES: string[] = [
  'class',
  'style',
  'src',
  'href',
  'SRC',
  'onerror',
  'onclick',
  'colspan',
  'data-fm-x',
  'title',
  'alt',
]

const VALUE_PIECES: string[] = [
  'javascript:alert(1)',
  ' javascript:x',
  'jav&#97;script:x',
  'JaVaScRiPt:x',
  'https://x.png',
  'http://e/x.png',
  '{Code}',
  'data:image/png;base64,AA',
  'data:text/html,x',
  'mailto:a@b.co',
  'color:red',
  ')',
  'url(javascript:x)',
  "url('https://x.png')",
  'expression(1)',
  '@import "x";',
  ';',
  '"',
  "'",
  '<',
  '>',
  '&quot;',
  '&amp;',
  ' ',
  '\t',
  'a',
]

// Sin /* ni */: un comentario partido se vuelve a juntar al sanear otra vez ("*//*/" da "*"), y el
// navegador lo lee igual. No es contenido que se pierda. Sin un url( abierto, ni aca ni en los
// valores: es el BUG de url() de abajo, con su propia prueba.
const CSS_PIECES: string[] = [
  'td{',
  '}',
  'color:red;',
  'background:url(https://x.png);',
  'background:url(javascript:x);',
  "background:url('javascript:x');",
  ')',
  '<',
  '</b>',
  '@import url(x.css);',
  'expression(',
  'behavior:x;',
  ';',
  '"',
  "'",
]

const TEXT_PIECES: string[] = [
  'hola',
  '{Var}',
  '<',
  '>',
  '&',
  '&lt;',
  '<!--',
  '-->',
  ' ',
  '"',
  '<!DOCTYPE x>',
]

function joined(pieces: string[], maxLength: number): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom(...pieces), { maxLength })
    .map((parts: string[]) => parts.join(''))
}

const ATTRIBUTE: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom(...ATTRIBUTE_NAMES),
    joined(VALUE_PIECES, 6),
    fc.constantFrom('"', "'", ''),
  )
  .map(([name, value, quote]: [string, string, string]) => ` ${name}=${quote}${value}${quote}`)

// Sin <style ...> abierto al azar: con o sin atributos puede terminar en "/>" (un valor con "/> lo
// cierra) y eso es el BUG de <style/> de abajo, con su propia prueba. Los <style> los arma
// STYLE_BLOCK, siempre cerrados; el </style> suelto si sale.
const OPEN_TAG: fc.Arbitrary<string> = fc
  .tuple(fc.constantFrom(...TAG_NAMES), fc.array(ATTRIBUTE, { maxLength: 3 }), fc.boolean())
  .map(
    ([name, attributes, selfClosing]: [string, string[], boolean]) =>
      `<${name}${attributes.join('')}${selfClosing ? '/' : ''}>`,
  )

const CLOSE_TAG: fc.Arbitrary<string> = fc
  .constantFrom(...TAG_NAMES, 'style')
  .map((name: string) => `</${name}>`)

const STYLE_BLOCK: fc.Arbitrary<string> = joined(CSS_PIECES, 8).map(
  (css: string) => `<style>${css}</style>`,
)

const HTML: fc.Arbitrary<string> = fc
  .array(fc.oneof(OPEN_TAG, CLOSE_TAG, fc.constantFrom(...TEXT_PIECES), STYLE_BLOCK), {
    maxLength: 12,
  })
  .map((parts: string[]) => parts.join(''))

function decodeAttribute(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match: string, code: string) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

// Las etiquetas de la salida; lo de adentro de un <style> es CSS, no etiquetas.
function outputTags(html: string): string[] {
  const withoutCss: string = html.replace(/<style>[\s\S]*?(<\/style>|$)/g, '<style>')
  return [...withoutCss.matchAll(/<[^>]*>/g)].map((match: RegExpMatchArray) => match[0])
}

// La salida siempre escribe name="valor", con el valor escapado.
function outputAttributes(tag: string): [string, string][] {
  return [...tag.matchAll(/\s([^\s="]+)="([^"]*)"/g)].map(
    (match: RegExpMatchArray): [string, string] => [match[1], decodeAttribute(match[2])],
  )
}

function outputCss(html: string): string[] {
  const inline: string[] = outputTags(html).flatMap((tag: string) =>
    outputAttributes(tag)
      .filter(([name]: [string, string]) => name === 'style')
      .map(([, value]: [string, string]) => value),
  )
  const blocks: string[] = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(
    (match: RegExpMatchArray) => match[1],
  )
  return [...inline, ...blocks]
}

describe('sanitizePdfHtml (propiedades)', () => {
  it('nunca lanza, ni con texto cualquiera', () => {
    fc.assert(
      fc.property(fc.oneof(HTML, fc.string({ maxLength: 200 })), (html: string) => {
        expect(typeof sanitizePdfHtml(html)).toBe('string')
      }),
      RUNS,
    )
  })

  it('sanear dos veces da lo mismo que una', () => {
    fc.assert(
      fc.property(HTML, (html: string) => {
        const once: string = sanitizePdfHtml(html)

        expect(sanitizePdfHtml(once)).toBe(once)
      }),
      RUNS,
    )
  })

  it('no sale ninguna etiqueta que ejecute o incruste algo', () => {
    fc.assert(
      fc.property(HTML, (html: string) => {
        for (const tag of outputTags(sanitizePdfHtml(html))) {
          expect(tag).not.toMatch(/^<\/?(script|svg|iframe|textarea|title)\b/i)
        }
      }),
      RUNS,
    )
  })

  it('no sale ningún atributo on…', () => {
    fc.assert(
      fc.property(HTML, (html: string) => {
        for (const tag of outputTags(sanitizePdfHtml(html))) {
          for (const [name] of outputAttributes(tag)) expect(name).not.toMatch(/^on/i)
        }
      }),
      RUNS,
    )
  })

  it('src y href solo salen con un esquema seguro o una {variable}', () => {
    fc.assert(
      fc.property(HTML, (html: string) => {
        for (const tag of outputTags(sanitizePdfHtml(html))) {
          for (const [name, value] of outputAttributes(tag)) {
            if (name !== 'src' && name !== 'href') continue
            // eslint-disable-next-line no-control-regex -- el navegador ignora controles y espacios
            const compact: string = value.replace(/[\u0000- ]/g, '')
            expect(compact).toMatch(/^(https?:\/\/|mailto:|data:image\/|\{[^{}\s]+\}$)/i)
          }
        }
      }),
      RUNS,
    )
  })

  // Solo un url() cerrado: el abierto ("url(javascript:x" al final) es la misma familia que el
  // it.fails de url() sin comillas en pdfHtml.test.ts, y ningun motor ejecuta javascript: en CSS.
  it('el CSS que sale no trae @import, expression() ni url(javascript:)', () => {
    fc.assert(
      fc.property(HTML, (html: string) => {
        for (const css of outputCss(sanitizePdfHtml(html))) {
          expect(css).not.toMatch(/@import|expression\s*\(|url\s*\(\s*['"]?\s*javascript:[^)]*\)/i)
        }
      }),
      RUNS,
    )
  })

  it('todo <style> que sale se cierra', () => {
    fc.assert(
      fc.property(HTML, (html: string) => {
        expect(sanitizePdfHtml(html)).not.toMatch(/<style\b[^>]*>(?![\s\S]*?<\/style>)/)
      }),
      RUNS,
    )
  })

  // BUG (hallazgo 5.2 de docs/Hallazgos-Pruebas.md, lo encontro esta prueba): un <style/> sale como
  // <style> sin cerrar. Lo que sigue no pasa por sanitizeCss, asi que un @import llega intacto, y
  // el navegador lee como CSS todo el contenido de despues. Pendiente de confirmar con el usuario;
  // it.fails avisa cuando se corrija.
  it.fails('un <style/> no deja un <style> abierto ni deja pasar un @import', () => {
    const out: string = sanitizePdfHtml('<style/>@import url(http://x/y.css);<td>hola</td>')

    expect(out).not.toContain('@import')
    expect(out).not.toMatch(/<style>(?![\s\S]*?<\/style>)/)
    // Con atributos pasa lo mismo, y ademas el <style> conserva el class
    expect(sanitizePdfHtml('<style class="a"/>x')).not.toMatch(
      /<style\b[^>]*>(?![\s\S]*?<\/style>)/,
    )
  })

  // BUG (hallazgo 5.3 de docs/Hallazgos-Pruebas.md, lo encontro esta prueba; misma causa que el
  // it.fails de url() sin comillas en pdfHtml.test.ts): la expresion de url() es perezosa, asi que
  // un url( sin cerrar se traga el url('javascript:x') que viene despues y, como empieza por
  // http://, pasa entero. Al sanear otra vez se vuelve none. Pendiente de confirmar con el usuario;
  // it.fails avisa cuando se corrija.
  it.fails('un url( sin cerrar no esconde un url(javascript:) que venga después', () => {
    const css: string = "a:url(http://e/x.png b:url('javascript:x');"
    const out: string = sanitizePdfHtml(`<style>${css}</style>`)

    expect(out).not.toMatch(/javascript:/i)
    expect(sanitizePdfHtml(out)).toBe(out)
  })
})
