import { describe, expect, it } from 'vitest'
import {
  addBlock,
  addClass,
  addSheet,
  canMoveBlock,
  canNestTable,
  classUsage,
  createClassFromCell,
  findCell,
  findTableOwner,
  moveBlock,
  nextClassName,
  removeBlock,
  removeClass,
  removeSheet,
  renameClass,
  selectedCellIds,
  setCellComponent,
  setCellContentKind,
  setCellHtml,
  setCellsClass,
  setCellText,
  setHtmlBlock,
  sheetOf,
  updateCellStyle,
  updateClass,
  updateTableStyle,
} from '../../src/lib/pdfDesignEdit/pdfDesignEdit'
import type { PdfCell, PdfDesign, PdfTable } from '../../src/types'

// Toda edicion que no cambia nada devuelve la misma referencia: el historial del disenador no
// registra pasos vacios.

function cell(id: string, extra: Partial<PdfCell> = {}): PdfCell {
  return { id, colSpan: 1, rowSpan: 1, content: { kind: 'text', text: '' }, ...extra }
}

function table(id: string, cells: PdfCell[]): PdfTable {
  return {
    id,
    columns: cells.map((c) => ({ id: `col-${c.id}` })),
    rows: [{ id: `r-${id}`, cells }],
  }
}

// Hoja 1: tabla t1 (a, b, y una celda con la tabla anidada t2), bloque HTML h1. Hoja 2: vacia.
function design(): PdfDesign {
  const inner: PdfTable = table('t2', [cell('n1', { className: 'gris' })])

  return {
    taxType: 'industria_comercio',
    fontFamily: 'Arial',
    fontSize: 11,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    classes: [
      { name: 'gris', backgroundColor: '#eee' },
      { name: 'negrita', bold: true },
    ],
    sheets: [
      {
        id: 's1',
        blocks: [
          {
            ...table('t1', [
              cell('a', { className: 'gris negrita', bold: true, align: 'center' }),
              cell('b', { bold: true }),
              cell('padre', { content: { kind: 'table', table: inner } }),
            ]),
            kind: 'table',
          },
          { kind: 'html', id: 'h1', html: '<p>hola</p>' },
        ],
      },
      { id: 's2', blocks: [] },
    ],
  }
}

describe('buscar', () => {
  it('encuentra celdas y tablas anidadas con su profundidad y su hoja', () => {
    const d: PdfDesign = design()

    expect(findCell(d, 'n1')).toMatchObject({ sheetId: 's1', depth: 2 })
    expect(findTableOwner(d, 't2')).toBe('padre')
    expect(findTableOwner(d, 't1')).toBeNull()
    expect(sheetOf(d, 'h1')).toBe('s1')
    expect(sheetOf(d, 'n1')).toBe('s1')
    expect(sheetOf(d, 'nada')).toBeNull()
  })

  it('selectedCellIds da las celdas del rectángulo', () => {
    expect(
      selectedCellIds(design(), {
        kind: 'cells',
        tableId: 't1',
        anchorCellId: 'a',
        focusCellId: 'b',
      }),
    ).toEqual(['a', 'b'])
    expect(selectedCellIds(design(), { kind: 'block', blockId: 'h1' })).toEqual([])
    expect(selectedCellIds(design(), null)).toEqual([])
  })
})

describe('contenido de las celdas', () => {
  it('texto, HTML y componente; uno igual no cambia nada', () => {
    const d: PdfDesign = design()
    const withText: PdfDesign = setCellText(d, 'a', 'Hola')

    expect(findCell(withText, 'a')?.cell.content).toEqual({ kind: 'text', text: 'Hola' })
    expect(setCellText(withText, 'a', 'Hola')).toBe(withText)
    expect(setCellText(d, 'nada', 'x')).toBe(d)

    const withHtml: PdfDesign = setCellHtml(d, 'n1', '<b>x</b>')
    expect(findCell(withHtml, 'n1')?.cell.content).toEqual({ kind: 'html', html: '<b>x</b>' })
    expect(setCellHtml(withHtml, 'n1', '<b>x</b>')).toBe(withHtml)

    const qr = { type: 'qr' as const, variable: 'Codigo', size: 80 }
    const withQr: PdfDesign = setCellComponent(d, 'b', qr)
    expect(setCellComponent(withQr, 'b', { ...qr })).toBe(withQr)
  })

  it('al cambiar de tipo conserva lo que puede', () => {
    const d: PdfDesign = setCellText(design(), 'a', 'a < b')
    const asHtml: PdfDesign = setCellContentKind(d, 'a', 'html')

    expect(findCell(asHtml, 'a')?.cell.content).toEqual({ kind: 'html', html: 'a &lt; b' })
    const back: PdfDesign = setCellContentKind(
      setCellHtml(d, 'a', '<b>uno</b>  <i>dos</i>'),
      'a',
      'text',
    )
    expect(findCell(back, 'a')?.cell.content).toEqual({ kind: 'text', text: 'uno dos' })
    expect(setCellContentKind(d, 'a', 'text')).toBe(d)
  })

  it('no anida tablas más allá del tope', () => {
    let d: PdfDesign = design()
    expect(canNestTable(d, 'a')).toBe(true)

    // t1 (1) > t2 (2) > ... hasta la profundidad 4.
    let target: string = 'n1'
    for (let depth = 2; depth < 4; depth++) {
      d = setCellContentKind(d, target, 'table')
      const created = findCell(d, target)?.cell.content
      if (created?.kind !== 'table') throw new Error('no creo la tabla')
      target = created.table.rows[0].cells[0].id
    }

    expect(findCell(d, target)?.depth).toBe(4)
    expect(canNestTable(d, target)).toBe(false)
    expect(setCellContentKind(d, target, 'table')).toBe(d)
  })

  it('estilo de celda y de tabla; undefined borra la clave', () => {
    const d: PdfDesign = design()
    const styled: PdfDesign = updateCellStyle(d, 'b', { italic: true, bold: undefined })

    expect(findCell(styled, 'b')?.cell).toEqual(cell('b', { italic: true }))
    expect(updateCellStyle(styled, 'b', { italic: true })).toBe(styled)
    expect(updateTableStyle(d, 't2', { style: 'width: 50%' })).not.toBe(d)
    expect(updateTableStyle(d, 't2', { style: undefined })).toBe(d)
  })
})

describe('hojas y bloques', () => {
  it('agregar y quitar hojas; la última no se quita', () => {
    const d: PdfDesign = design()

    expect(addSheet(d).sheets).toHaveLength(3)
    expect(removeSheet(d, 's2').sheets).toHaveLength(1)
    const single: PdfDesign = removeSheet(d, 's2')
    expect(removeSheet(single, 's1')).toBe(single)
    expect(removeSheet(d, 'nada')).toBe(d)
  })

  it('agregar y quitar bloques', () => {
    const d: PdfDesign = addBlock(design(), 's2', 'table')

    expect(d.sheets[1].blocks[0]).toMatchObject({ kind: 'table' })
    expect(addBlock(design(), 's2', 'html').sheets[1].blocks[0]).toMatchObject({
      kind: 'html',
      html: '',
    })
    expect(removeBlock(design(), 'h1').sheets[0].blocks.map((b) => b.id)).toEqual(['t1'])
    expect(removeBlock(design(), 'nada')).toEqual(design())
  })

  it('mover un bloque dentro de su hoja y, en el borde, a la vecina', () => {
    const d: PdfDesign = design()

    expect(moveBlock(d, 'h1', -1).sheets[0].blocks.map((b) => b.id)).toEqual(['h1', 't1'])
    const down: PdfDesign = moveBlock(d, 'h1', 1)
    expect(down.sheets[0].blocks.map((b) => b.id)).toEqual(['t1'])
    expect(down.sheets[1].blocks.map((b) => b.id)).toEqual(['h1'])
    expect(canMoveBlock(d, 't1', -1)).toBe(false)
    expect(canMoveBlock(d, 'h1', 1)).toBe(true)
  })

  it('el HTML de un bloque; igual, misma referencia', () => {
    const d: PdfDesign = design()

    expect(setHtmlBlock(d, 'h1', '<p>hola</p>')).toBe(d)
    expect(setHtmlBlock(d, 'h1', '<p>chao</p>').sheets[0].blocks[1]).toMatchObject({
      html: '<p>chao</p>',
    })
  })
})

describe('clases', () => {
  it('nextClassName da el primer claseN libre', () => {
    expect(nextClassName(design())).toBe('clase3')
    expect(nextClassName(addClass(design(), { name: 'clase3' }))).toBe('clase4')
  })

  it('addClass rechaza nombres inválidos, reservados o repetidos', () => {
    const d: PdfDesign = design()

    expect(addClass(d, { name: 'nueva' }).classes).toHaveLength(3)
    expect(addClass(d, { name: 'fm-t' })).toBe(d)
    expect(addClass(d, { name: '1mala' })).toBe(d)
    expect(addClass(d, { name: 'gris' })).toBe(d)
  })

  it('updateClass cambia solo esa; sin cambios, el mismo diseño', () => {
    const d: PdfDesign = design()

    expect(updateClass(d, 'gris', { backgroundColor: '#ddd' }).classes[0].backgroundColor).toBe(
      '#ddd',
    )
    expect(updateClass(d, 'gris', { backgroundColor: '#eee' })).toBe(d)
  })

  it('renombrar y quitar alcanzan a las celdas que la usan, también anidadas', () => {
    const renamed: PdfDesign = renameClass(design(), 'gris', 'fondo')

    expect(findCell(renamed, 'a')?.cell.className).toBe('fondo negrita')
    expect(findCell(renamed, 'n1')?.cell.className).toBe('fondo')
    expect(renameClass(design(), 'gris', 'negrita')).toEqual(design())

    const removed: PdfDesign = removeClass(design(), 'gris')
    expect(findCell(removed, 'a')?.cell.className).toBe('negrita')
    expect('className' in (findCell(removed, 'n1')?.cell ?? {})).toBe(false)
  })

  it('setCellsClass pone o quita sin tocar las otras clases', () => {
    const on: PdfDesign = setCellsClass(design(), ['a', 'b'], 'gris', true)

    expect(findCell(on, 'a')?.cell.className).toBe('gris negrita')
    expect(findCell(on, 'b')?.cell.className).toBe('gris')
    expect(findCell(setCellsClass(on, ['a'], 'gris', false), 'a')?.cell.className).toBe('negrita')
  })

  it('createClassFromCell toma lo propio del foco y las celdas sueltan lo que ahora da la clase', () => {
    const d: PdfDesign = createClassFromCell(design(), ['a', 'b'], 'a', 'titulo')
    const titulo = d.classes.find((item) => item.name === 'titulo')

    expect(titulo).toEqual({ name: 'titulo', bold: true, align: 'center' })
    expect(findCell(d, 'a')?.cell).toMatchObject({ className: 'gris negrita titulo' })
    expect(findCell(d, 'a')?.cell.bold).toBeUndefined()
    expect(findCell(d, 'b')?.cell.bold).toBeUndefined()
    expect(createClassFromCell(design(), ['a'], 'a', 'gris')).toEqual(design())
  })

  it('classUsage cuenta celdas por clase, también en tablas anidadas', () => {
    expect(classUsage(design())).toEqual(
      new Map([
        ['gris', 2],
        ['negrita', 1],
      ]),
    )
  })
})
