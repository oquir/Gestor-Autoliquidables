import { describe, expect, it } from 'vitest'
import { createPdfComponent } from '../../src/lib/pdfComponents/pdfComponents'
import { createBlankDesign } from '../../src/lib/pdfDesign/pdfDesign'
import {
  buildPdfHtml,
  pdfFileName,
  pickLatestPdfFile,
  readPdfFile,
} from '../../src/lib/pdfFile/pdfFile'
import { MESSAGES } from '../../src/lib/pdfFile/pdfFile.constants'
import { factoryPdfDesign } from '../../src/lib/pdfTemplates/pdfTemplates'
import type { PdfCell, PdfComponentType, PdfDesign, PdfFileRead, PdfTable } from '../../src/types'

// El .html es la unica fuente del diseno: lo que se publica tiene que reabrir igual. Los ids son
// uuid nuevos en cada lectura, asi que se comparan sin ellos.

function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutIds)
  if (value === null || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'id')
      .map(([key, item]) => [key, withoutIds(item)]),
  )
}

function read(html: string, fileName?: string): Extract<PdfFileRead, { ok: true }> {
  const result: PdfFileRead = readPdfFile(html, 'industria_comercio', fileName)
  if (!result.ok) throw new Error(`No se pudo leer: ${result.error}`)

  return result
}

function cell(content: PdfCell['content'], extra: Partial<PdfCell> = {}): PdfCell {
  return { id: 'c', colSpan: 1, rowSpan: 1, content, ...extra }
}

function designWith(cells: PdfCell[], extra: Partial<PdfDesign> = {}): PdfDesign {
  const table: PdfTable = {
    id: 't',
    columns: cells.map((_, index) => ({ id: `col${index}` })),
    rows: [{ id: 'r', cells }],
  }

  return {
    ...createBlankDesign('industria_comercio'),
    ...extra,
    sheets: [{ id: 's', blocks: [{ ...table, kind: 'table' }] }],
  }
}

describe('ida y vuelta', () => {
  it('la plantilla de fábrica del ICA reabre igual y vuelve a dar el mismo HTML byte a byte', () => {
    const design: PdfDesign | null = factoryPdfDesign('industria_comercio')
    if (!design) throw new Error('sin plantilla')

    const html: string = buildPdfHtml(design, 3)
    const reopened = read(html)

    expect(reopened.source).toBe('formmaker')
    expect(reopened.version).toBe(3)
    expect(reopened.warnings).toEqual([])
    expect(withoutIds(reopened.design)).toEqual(withoutIds(design))
    expect(buildPdfHtml(reopened.design, 3)).toBe(html)
  })

  it.each<PdfComponentType>([
    'image',
    'verticalText',
    'nit',
    'signatures',
    'barcode',
    'qr',
    'stamp',
  ])('el componente %s se rearma desde su configuración', (type) => {
    const component = createPdfComponent(type)
    if (component.type === 'image' || component.type === 'stamp') {
      component.src = 'https://a.co/escudo.png'
    }
    const design: PdfDesign = designWith([cell({ kind: 'component', component })])

    expect(withoutIds(read(buildPdfHtml(design, null)).design)).toEqual(withoutIds(design))
  })

  it('celdas de texto, HTML, tabla anidada, estilos, clases, márgenes y varias hojas', () => {
    const inner: PdfTable = {
      id: 'in',
      columns: [{ id: 'x', width: 40 }],
      rows: [{ id: 'ir', height: 20, cells: [cell({ kind: 'text', text: 'adentro' })] }],
    }
    const base: PdfDesign = designWith(
      [
        cell(
          { kind: 'text', text: 'Hola & <adiós>' },
          { bold: true, align: 'center', className: 'gris' },
        ),
        cell(
          { kind: 'html', html: '<b>negrita</b> {Variable}' },
          { colSpan: 2, style: 'color: red' },
        ),
        cell({ kind: 'table', table: inner }),
        cell({ kind: 'text', text: '' }),
      ],
      {
        fontFamily: 'Verdana',
        fontSize: 9,
        margins: { top: 1, right: 2.5, bottom: 3, left: 4 },
        classes: [{ name: 'gris', backgroundColor: '#eee', css: 'border: 0' }],
      },
    )
    const design: PdfDesign = {
      ...base,
      sheets: [
        ...base.sheets,
        { id: 's2', blocks: [{ kind: 'html', id: 'h', html: '<p>hoja dos</p>' }] },
      ],
    }

    expect(withoutIds(read(buildPdfHtml(design, null)).design)).toEqual(
      withoutIds(normalized(design)),
    )
  })
})

// El colSpan 2 en una tabla de 4 columnas deja un hueco que normalizeTable rellena al leer.
function normalized(design: PdfDesign): PdfDesign {
  const first = design.sheets[0].blocks[0]
  if (first.kind !== 'table') return design

  return {
    ...design,
    sheets: [
      {
        ...design.sheets[0],
        blocks: [
          {
            ...first,
            columns: [...first.columns, { id: 'extra' }],
          },
        ],
      },
      ...design.sheets.slice(1),
    ],
  }
}

describe('nombre y versión', () => {
  it('el nombre lleva la versión o dice borrador', () => {
    expect(pdfFileName('industria_comercio', 4)).toBe('industria_comercio_v4.html')
    expect(pdfFileName('autorretencion', null)).toBe('autorretencion_borrador.html')
  })

  it('sin data-fm-version la versión sale del nombre del archivo', () => {
    const html: string = buildPdfHtml(createBlankDesign('industria_comercio'), null)

    expect(read(html, 'industria_comercio_v7.html').version).toBe(7)
    expect(read(html, 'otra_cosa.html').version).toBeNull()
  })

  it('pickLatestPdfFile elige el de N más alta entre los legibles', () => {
    const blank = (version: number | null): PdfFileRead => ({
      ok: true,
      source: 'formmaker',
      design: createBlankDesign('industria_comercio'),
      version,
      warnings: [],
    })

    expect(pickLatestPdfFile([blank(2), { ok: false, error: 'x' }, blank(5), blank(5)])).toBe(2)
    expect(pickLatestPdfFile([{ ok: false, error: 'x' }])).toBe(-1)
    expect(pickLatestPdfFile([blank(null)])).toBe(0)
  })
})

describe('archivos que no se abren', () => {
  const html: string = buildPdfHtml(createBlankDesign('industria_comercio'), 1)

  it('uno de otro impuesto, cada uno tiene su plantilla', () => {
    const result: PdfFileRead = readPdfFile(html, 'autorretencion')

    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('Industria y Comercio')
  })

  it('uno de una versión más nueva, sin impuesto o con el formato roto', () => {
    expect(
      readPdfFile(html.replace('data-fm-design="3"', 'data-fm-design="99"'), 'industria_comercio'),
    ).toEqual({
      ok: false,
      error: MESSAGES.newer,
    })
    expect(
      readPdfFile(
        html.replace('data-fm-tax="industria_comercio"', 'data-fm-tax="x"'),
        'industria_comercio',
      ),
    ).toEqual({ ok: false, error: MESSAGES.unknownTax })
    expect(
      readPdfFile(html.replace('data-fm-design="3"', 'data-fm-design="x"'), 'industria_comercio'),
    ).toEqual({
      ok: false,
      error: MESSAGES.badFormat,
    })
  })

  it('uno vacío no trae nada que pintar', () => {
    expect(readPdfFile('<html><body>  </body></html>', 'industria_comercio')).toEqual({
      ok: false,
      error: MESSAGES.empty,
    })
  })
})

describe('archivos FormMaker tocados a mano', () => {
  const html: string = buildPdfHtml(createBlankDesign('industria_comercio'), 1)

  it('una fuente o un tamaño que no se leen caen al de siempre y avisan', () => {
    const result = read(
      html
        .replace('data-fm-font="Arial"', 'data-fm-font="Comic Sans"')
        .replace('data-fm-font-size="11"', 'data-fm-font-size="x"'),
    )

    expect(result.design.fontFamily).toBe('Arial')
    expect(result.design.fontSize).toBe(11)
    expect(result.warnings).toEqual([MESSAGES.font, MESSAGES.fontSize])
  })

  it('clases dañadas avisan y las sanas se conservan', () => {
    const design: PdfDesign = {
      ...createBlankDesign('industria_comercio'),
      classes: [{ name: 'ok', bold: true }],
    }
    const broken: string = buildPdfHtml(design, 1).replace(
      /data-fm-classes="[^"]*"/,
      'data-fm-classes="[roto"',
    )

    expect(read(broken).warnings).toContain(MESSAGES.classes)
    expect(read(buildPdfHtml(design, 1)).design.classes).toEqual([{ name: 'ok', bold: true }])
  })

  it('un script metido a mano se quita y se avisa', () => {
    const result = read(html.replace('</div>\n</body>', '<script>alert(1)</script></div>\n</body>'))

    expect(result.warnings).toContain(MESSAGES.unsafe)
    expect(JSON.stringify(result.design)).not.toContain('alert')
  })
})

describe('plantillas hechas a mano', () => {
  it('entran en la hoja 1, una tabla de primer nivel por bloque, y cuentan sus variables', () => {
    const result = read(
      '<html><head><style>@page { size: A4 }</style></head><body><p>Encabezado {Nombre}</p><table><tr><td>{Nit}</td></tr></table><table><tr><td>{Nombre}</td></tr></table></body></html>',
      'ica_v2.html',
    )

    expect(result.source).toBe('legacy')
    expect(result.version).toBe(2)
    expect(result.design.sheets).toHaveLength(1)
    expect(result.design.sheets[0].blocks.map((block) => block.kind)).toEqual([
      'html',
      'html',
      'html',
    ])
    expect(result.warnings[0]).toContain('3 bloques')
    expect(result.warnings.join(' ')).toContain('2 variables distintas: {Nombre}, {Nit}')
    expect(result.warnings).toContain(MESSAGES.page)
  })

  it('una variable en un atributo avisa; src, href y data-fm-* no cuentan', () => {
    const result = read(
      '<html><body><table><tr><td title="{Nombre}" data-fm-x="{Oculta}"><a href="{Url}">x</a><img src="{Logo}"></td></tr></table></body></html>',
    )
    const warning: string | undefined = result.warnings.find((text) =>
      text.startsWith('Atributos con variable'),
    )

    expect(warning).toContain('title="{Nombre}"')
    expect(warning).not.toContain('{Oculta}')
    expect(warning).not.toContain('{Url}')
    expect(warning).not.toContain('{Logo}')
  })

  it('sin variables en los atributos no sale ese aviso', () => {
    const result = read(
      '<html><body><table><tr><td title="fijo">{Nombre}</td></tr></table></body></html>',
    )

    expect(result.warnings.some((text) => text.startsWith('Atributos con variable'))).toBe(false)
  })
})
