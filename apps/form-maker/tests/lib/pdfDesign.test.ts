import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PDF_ZOOM_MAX, PDF_ZOOM_MIN } from '../../src/constants/pdfDesign'
import {
  cleanPdfVariable,
  createPdfComponent,
  pdfComponentHtml,
  pdfComponentText,
  pdfImageWarnings,
} from '../../src/lib/pdfComponents/pdfComponents'
import {
  cellStyleMap,
  clampExtraMargin,
  clampPdfZoom,
  contentBox,
  createBlankDesign,
  fitPdfZoom,
  inheritedCellStyle,
  isValidPdfClassName,
  normalizeMargins,
  pdfClassTokens,
  pdfStyleSheet,
  readPdfEntryParams,
  resolvePdfTaxType,
  stepPdfZoom,
} from '../../src/lib/pdfDesign/pdfDesign'
import {
  loadPdfDesign,
  parsePdfComponent,
  pdfDesignKey,
  savePdfDesign,
} from '../../src/lib/pdfDesignBank/pdfDesignBank'
import {
  PDF_DESIGN_SCHEMA_VERSION,
  QUOTA_MESSAGE,
} from '../../src/lib/pdfDesignBank/pdfDesignBank.constants'
import { migratePdfDesign } from '../../src/lib/pdfDesignBank/pdfDesignBank.migrations'
import { sanitizePdfHtml } from '../../src/lib/pdfHtml/pdfHtml'
import { factoryPdfDesign, hasFactoryPdfDesign } from '../../src/lib/pdfTemplates/pdfTemplates'
import type { PdfComponentContext, PdfDesign, PdfTable } from '../../src/types'
import { installMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage'

const FILE: PdfComponentContext = {
  mode: 'file',
  fontFamily: 'Arial',
  renderVerticalText: () => null,
}

const CANVAS: PdfComponentContext = { ...FILE, mode: 'canvas' }

describe('márgenes, caja y zoom', () => {
  it('el margen extra va de a medio mm, entre 0 y el tope', () => {
    expect(clampExtraMargin(2.3)).toBe(2.5)
    expect(clampExtraMargin(-4)).toBe(0)
    expect(clampExtraMargin(Number.NaN)).toBe(0)
    expect(clampExtraMargin(500)).toBe(40)
    expect(normalizeMargins({ top: 1.2, right: -1, bottom: 99, left: 0.26 })).toEqual({
      top: 1,
      right: 0,
      bottom: 40,
      left: 0.5,
    })
  })

  it('el margen extra achica la caja de contenido', () => {
    const none = contentBox({ top: 0, right: 0, bottom: 0, left: 0 })
    const some = contentBox({ top: 10, right: 10, bottom: 10, left: 10 })

    expect(some.width).toBeLessThan(none.width)
    expect(some.height).toBeLessThan(none.height)
  })

  it('el zoom salta al siguiente múltiplo del paso y respeta los topes', () => {
    expect(stepPdfZoom(1.13, 1)).toBe(1.25)
    expect(stepPdfZoom(1.25, 1)).toBe(1.5)
    expect(stepPdfZoom(1.13, -1)).toBe(1)
    expect(stepPdfZoom(PDF_ZOOM_MAX, 1)).toBe(PDF_ZOOM_MAX)
    expect(clampPdfZoom(Number.NaN)).toBe(1)
    expect(clampPdfZoom(0.1)).toBe(PDF_ZOOM_MIN)
    expect(clampPdfZoom(1.2500000001)).toBe(1.25)
  })

  it('ajustar al ancho redondea hacia abajo a 5%', () => {
    const zoom: number = fitPdfZoom(1000)

    expect(Math.round(zoom * 100) % 5).toBe(0)
    expect(fitPdfZoom(0)).toBe(PDF_ZOOM_MIN)
  })
})

describe('clases y estilos', () => {
  it('nombres válidos y el prefijo reservado', () => {
    expect(isValidPdfClassName('titulo-1')).toBe(true)
    expect(isValidPdfClassName('fm-t')).toBe(false)
    expect(isValidPdfClassName('1x')).toBe(false)
    expect(isValidPdfClassName('a b')).toBe(false)
    expect(pdfClassTokens('  a b a ')).toEqual(['a', 'b'])
  })

  it('el <style> lleva la base y cada clase válida; una llave no cierra la regla', () => {
    const design: PdfDesign = {
      ...createBlankDesign('industria_comercio'),
      classes: [
        { name: 'gris', backgroundColor: '#eee' },
        { name: 'mala', css: 'color: red} body {display: none' },
        { name: 'fm-oculta', bold: true },
      ],
    }
    const sheet: string = pdfStyleSheet(design)

    expect(sheet).toContain('.fm-t { border-collapse: collapse; width: 100%; table-layout: fixed }')
    expect(sheet).toContain('.gris, .fm-t > tbody > tr > td.gris { background-color: #eee }')
    expect(sheet).not.toContain('body {')
    expect(sheet).not.toContain('fm-oculta')
  })

  it('cellStyleMap: todos los bordes en uno; con clase, los lados que no lleva se apagan', () => {
    const all = { top: true, right: true, bottom: true, left: true }

    expect(
      cellStyleMap({
        id: 'c',
        colSpan: 1,
        rowSpan: 1,
        content: { kind: 'text', text: '' },
        borders: all,
        bold: true,
      }),
    ).toEqual({
      border: '1px solid #000',
      fontWeight: 'bold',
    })
    expect(
      cellStyleMap({
        id: 'c',
        colSpan: 1,
        rowSpan: 1,
        content: { kind: 'text', text: '' },
        className: 'x',
        borders: { top: true, right: false, bottom: false, left: false },
      }),
    ).toEqual({
      borderTop: '1px solid #000',
      borderRight: 'none',
      borderBottom: 'none',
      borderLeft: 'none',
    })
  })

  it('inheritedCellStyle junta lo de las clases en el orden del <style>', () => {
    const design: PdfDesign = {
      ...createBlankDesign('industria_comercio'),
      classes: [
        { name: 'a', bold: true, fontSize: 8 },
        { name: 'b', fontSize: 10 },
      ],
    }

    expect(
      inheritedCellStyle(design, {
        id: 'c',
        colSpan: 1,
        rowSpan: 1,
        content: { kind: 'text', text: '' },
        className: 'b a',
      }),
    ).toEqual({ bold: true, fontSize: 10 })
  })
})

describe('qué impuesto abre el diseñador', () => {
  it('gana la URL si es un impuesto conocido; si no, el del formulario', () => {
    expect(readPdfEntryParams('?impuesto=autorretencion')).toEqual({ impuesto: 'autorretencion' })
    expect(resolvePdfTaxType('industria_comercio', { impuesto: 'autorretencion' })).toBe(
      'autorretencion',
    )
    expect(resolvePdfTaxType('industria_comercio', { impuesto: 'otro' })).toBe('industria_comercio')
    expect(resolvePdfTaxType(null, {})).toBeNull()
  })
})

describe('componentes', () => {
  it('cada componente nace con sus valores por defecto, en una copia propia', () => {
    const a = createPdfComponent('signatures')
    const b = createPdfComponent('signatures')

    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })

  it('su HTML sobrevive al saneo y lleva los atributos para reabrirlo', () => {
    for (const type of [
      'image',
      'verticalText',
      'nit',
      'signatures',
      'barcode',
      'qr',
      'stamp',
    ] as const) {
      const html: string = pdfComponentHtml(createPdfComponent(type), FILE)

      expect(sanitizePdfHtml(html)).toBe(html)
      expect(html).toContain(`data-fm-component="${type}"`)
    }
  })

  it('código de barras y QR: en el archivo, la variable para el back; en el lienzo, una muestra', () => {
    const barcode = createPdfComponent('barcode')

    expect(pdfComponentHtml(barcode, FILE)).toContain('src="{Code}"')
    expect(pdfComponentHtml(barcode, CANVAS)).not.toContain('src=')
  })

  it('el texto vertical usa la imagen si hay con qué dibujarla; si no, writing-mode', () => {
    const vertical = createPdfComponent('verticalText')
    const withCanvas: PdfComponentContext = {
      ...FILE,
      renderVerticalText: () => ({ src: 'data:image/png;base64,AAA', width: 12, height: 80 }),
    }

    expect(pdfComponentHtml(vertical, withCanvas)).toContain('src="data:image/png;base64,AAA"')
    expect(pdfComponentHtml(vertical, FILE)).toContain('writing-mode: vertical-rl')
  })

  it('el texto que queda al pasar la celda a texto', () => {
    expect(pdfComponentText(createPdfComponent('nit'))).toBe('NIT {Identificacion} DV {DV}')
    expect(pdfComponentText(createPdfComponent('qr'))).toBe('{CodigoQR}')
    expect(pdfComponentText(createPdfComponent('signatures'))).toBe(
      'FIRMA DEL DECLARANTE / FIRMA DEL CONTADOR O REVISOR FISCAL',
    )
    expect(cleanPdfVariable(' {Code } ')).toBe('Code')
  })

  it('los avisos de imagen: ruta incompleta, WebP, base64 pesado, carga fallida y tamaño', () => {
    expect(pdfImageWarnings('{Escudo}', { status: 'none' }, {})).toEqual([])
    expect(pdfImageWarnings('/img/escudo.png', { status: 'none' }, {})[0]).toContain('URL completa')
    expect(pdfImageWarnings('https://a.co/x.webp', { status: 'none' }, {})[0]).toContain('WebP')
    expect(
      pdfImageWarnings(`data:image/png;base64,${'A'.repeat(220_000)}`, { status: 'none' }, {})[0],
    ).toContain('KB')
    expect(pdfImageWarnings('https://a.co/x.png', { status: 'error' }, {})).toEqual([
      'No se pudo cargar la imagen: revisa la dirección.',
    ])
    expect(
      pdfImageWarnings(
        'https://a.co/x.png',
        { status: 'ok', naturalWidth: 2000, naturalHeight: 1000 },
        { height: 60 },
      )[0],
    ).toContain('2000 × 1000')
  })

  it('un componente leído con forma rota se descarta', () => {
    expect(parsePdfComponent({ type: 'qr', variable: 'X', size: 80 })).toEqual({
      type: 'qr',
      variable: 'X',
      size: 80,
    })
    expect(parsePdfComponent({ type: 'qr', size: 'grande' })).toBeNull()
    expect(parsePdfComponent({ type: 'video' })).toBeNull()
  })
})

describe('plantillas de fábrica', () => {
  it('solo ICA trae plantilla', () => {
    expect(hasFactoryPdfDesign('industria_comercio')).toBe(true)
    expect(factoryPdfDesign('retencion_industria_comercio')).toBeNull()
    expect(factoryPdfDesign('autorretencion')).toBeNull()
  })

  it('la del ICA es una hoja con una tabla sana y clases válidas', () => {
    const design: PdfDesign | null = factoryPdfDesign('industria_comercio')
    if (!design) throw new Error('sin plantilla')

    expect(design.sheets).toHaveLength(1)
    expect(design.classes.every((item) => isValidPdfClassName(item.name))).toBe(true)
    const block = design.sheets[0].blocks[0]
    expect(block.kind).toBe('table')
    expect((block as PdfTable).rows.length).toBeGreaterThan(10)
  })

  it('cada llamada arma una copia propia', () => {
    expect(factoryPdfDesign('industria_comercio')?.classes).not.toBe(
      factoryPdfDesign('industria_comercio')?.classes,
    )
  })
})

describe('guardado local del diseño', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = installMemoryStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('se guarda por impuesto y se lee igual, con la versión publicada', () => {
    const design: PdfDesign = createBlankDesign('industria_comercio')
    const saved = savePdfDesign(design, new Date('2026-11-24T10:00:00Z'), 4)

    expect(saved).toEqual({ ok: true, savedAt: '2026-11-24T10:00:00.000Z' })
    expect(loadPdfDesign('industria_comercio')).toEqual({
      schemaVersion: PDF_DESIGN_SCHEMA_VERSION,
      savedAt: '2026-11-24T10:00:00.000Z',
      design,
      version: 4,
    })
    expect(loadPdfDesign('autorretencion')).toBeNull()
  })

  it('uno guardado bajo otro impuesto, roto o más nuevo no se lee', () => {
    const design: PdfDesign = createBlankDesign('autorretencion')
    storage.setItem(
      pdfDesignKey('industria_comercio'),
      JSON.stringify({ schemaVersion: 2, savedAt: 'x', design }),
    )

    expect(loadPdfDesign('industria_comercio')).toBeNull()
    storage.setItem(pdfDesignKey('industria_comercio'), '{roto')
    expect(loadPdfDesign('industria_comercio')).toBeNull()
  })

  it('con la cuota llena no lanza y dice por qué', () => {
    storage.quotaBytes = 10

    expect(savePdfDesign(createBlankDesign('industria_comercio'))).toEqual({
      ok: false,
      error: QUOTA_MESSAGE,
    })
  })

  it('un diseño v1 (una tabla por hoja) se migra a bloques y se lee', () => {
    const v1 = {
      schemaVersion: 1,
      savedAt: '2026-01-01T00:00:00.000Z',
      design: {
        ...createBlankDesign('industria_comercio'),
        sheets: [
          {
            id: 's',
            rows: [
              {
                id: 'r',
                cells: [
                  { id: 'a', colSpan: 1, rowSpan: 1, text: 'Hola', width: 120 },
                  { id: 'b', colSpan: 2, rowSpan: 1, text: 'Ancha' },
                ],
              },
            ],
          },
        ],
      },
    }
    storage.setItem(pdfDesignKey('industria_comercio'), JSON.stringify(v1))

    const loaded = loadPdfDesign('industria_comercio')
    const block = loaded?.design.sheets[0].blocks[0]
    expect(block?.kind).toBe('table')
    if (block?.kind !== 'table') return
    expect(block.columns.map((column) => column.width)).toEqual([120, undefined, undefined])
    expect(block.rows[0].cells.map((cell) => cell.content)).toEqual([
      { kind: 'text', text: 'Hola' },
      { kind: 'text', text: 'Ancha' },
    ])
    expect(migratePdfDesign({ schemaVersion: 2, design: {} }, 2)).toEqual({
      schemaVersion: 2,
      design: {},
    })
  })
})
