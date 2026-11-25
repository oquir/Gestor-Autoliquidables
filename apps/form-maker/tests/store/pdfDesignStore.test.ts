import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { findCell } from '../../src/lib/pdfDesignEdit/pdfDesignEdit'
import { createBlankDesign } from '../../src/lib/pdfDesign/pdfDesign'
import { savePdfDesign } from '../../src/lib/pdfDesignBank/pdfDesignBank'
import type { PdfDesign, PdfDesignState, PdfTable } from '../../src/types'
import { installMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage'
import { later, startClock, stopClock } from '../helpers/storeHarness'

// El store del disenador de PDF, con su propio historial. Cada prueba arranca con un diseno en
// blanco de ICA y una tabla de 2x2 en la hoja 1.
const storage: MemoryStorage = installMemoryStorage()
// El reloj falso antes del import: createBurstGate guarda Date.now al cargarse el modulo.
startClock()
const { usePdfDesignStore } = await import('../../src/store/pdfDesignStore')

const INITIAL: PdfDesignState = usePdfDesignStore.getState()

function state(): PdfDesignState {
  return usePdfDesignStore.getState()
}

function pastSteps(): number {
  return usePdfDesignStore.temporal.getState().pastStates.length
}

function firstTable(): PdfTable {
  const block = state().design?.sheets[0].blocks[0]
  if (block?.kind !== 'table') throw new Error('sin tabla')
  return block
}

function cellIds(): string[][] {
  return firstTable().rows.map((row) => row.cells.map((cell) => cell.id))
}

function selectCells(anchor: string, focus: string): void {
  const tableId: string = firstTable().id
  state().selectCell(tableId, anchor, false)
  if (focus !== anchor) state().selectCell(tableId, focus, true)
}

afterAll(stopClock)

beforeEach(() => {
  storage.clear()
  usePdfDesignStore.setState(INITIAL, true)
  usePdfDesignStore.setState({
    design: createBlankDesign('industria_comercio'),
    activeSheetId: null,
  })
  usePdfDesignStore.setState({ activeSheetId: state().design?.sheets[0].id ?? null })
  state().addBlock('table')
  usePdfDesignStore.temporal.getState().clear()
  later()
})

describe('abrir el diseño', () => {
  it('sin nada guardado arranca con la plantilla de fábrica del impuesto, sin historial', () => {
    usePdfDesignStore.setState({ design: null })
    state().openDesign('industria_comercio')

    expect(state().design?.sheets[0].blocks.length).toBeGreaterThan(0)
    expect(state().design?.classes.length).toBeGreaterThan(0)
    expect(pastSteps()).toBe(0)
  })

  it('un impuesto sin plantilla arranca en blanco', () => {
    state().openDesign('autorretencion')

    expect(state().design?.taxType).toBe('autorretencion')
    expect(state().design?.sheets[0].blocks).toEqual([])
  })

  it('lo guardado gana, con su versión publicada', () => {
    const saved: PdfDesign = { ...createBlankDesign('autorretencion'), fontSize: 9 }
    savePdfDesign(saved, new Date('2026-11-24T00:00:00Z'), 6)
    state().openDesign('autorretencion')

    expect(state().design?.fontSize).toBe(9)
    expect(state().publishedVersion).toBe(6)
    expect(state().lastSavedAt).toBe('2026-11-24T00:00:00.000Z')
  })

  it('reabrir el mismo impuesto no pisa lo que se estaba editando', () => {
    state().setFontSize(14)
    state().openDesign('industria_comercio')

    expect(state().design?.fontSize).toBe(14)
  })

  it('cargar un diseño de otro impuesto no hace nada', () => {
    const before: PdfDesignState = state()
    state().loadDesign(createBlankDesign('autorretencion'), 3)

    expect(state()).toBe(before)
  })
})

describe('ediciones e historial', () => {
  it('cada edición se deshace y una sin cambios no crea paso', () => {
    state().setFontSize(14)
    later()
    state().setFontSize(14)
    state().setFontSize(-1)
    expect(pastSteps()).toBe(1)

    state().undo()
    expect(state().design?.fontSize).toBe(11)
    state().redo()
    expect(state().design?.fontSize).toBe(14)
  })

  it('los márgenes se normalizan al guardarlos', () => {
    state().setMargins({ top: 2.3, left: 99 })

    expect(state().design?.margins).toEqual({ top: 2.5, right: 0, bottom: 0, left: 40 })
  })

  it('la versión publicada vive fuera del historial: deshacer nunca repite una N', () => {
    state().setFontSize(14)
    later()
    state().markPublished(5)
    later()
    state().undo()

    expect(state().publishedVersion).toBe(5)
    expect(state().design?.fontSize).toBe(11)
  })

  it('zoom, herramienta y pestaña son de vista: no crean pasos', () => {
    state().setZoom(2)
    state().setTool('hand')
    state().setSidebarTab('document')

    expect(state().zoom).toBe(2)
    expect(pastSteps()).toBe(0)
  })
})

describe('tabla de la selección', () => {
  it('agregar un bloque lo deja seleccionado', () => {
    state().addBlock('html')
    const blocks = state().design?.sheets[0].blocks ?? []

    expect(state().selection).toEqual({ kind: 'block', blockId: blocks[blocks.length - 1].id })
  })

  it('combinar deja seleccionada la celda de arriba a la izquierda', () => {
    const [[a], [, d]] = cellIds()
    selectCells(a, d)
    later()
    state().mergeSelection()

    expect(firstTable().rows[0].cells[0]).toMatchObject({ id: a, colSpan: 2, rowSpan: 2 })
    expect(state().selection).toMatchObject({ anchorCellId: a, focusCellId: a })
  })

  it('quitar la fila de la selección suelta la selección huérfana', () => {
    const [[a]] = cellIds()
    selectCells(a, a)
    later()
    state().removeRow()

    expect(firstTable().rows).toHaveLength(1)
    expect(findCell(state().design as PdfDesign, a)).toBeNull()
    expect(state().selection).toBeNull()
  })

  it('sin selección, las operaciones de tabla no hacen nada', () => {
    state().clearSelection()
    const before: PdfDesignState = state()
    state().insertRow('below')
    state().mergeSelection()

    expect(state()).toBe(before)
  })

  it('el estilo se aplica a toda la selección', () => {
    const [[a, b]] = cellIds()
    selectCells(a, b)
    later()
    state().updateSelectionStyle({ bold: true })

    expect(firstTable().rows[0].cells.map((cell) => cell.bold)).toEqual([true, true])
    expect(firstTable().rows[1].cells.map((cell) => cell.bold)).toEqual([undefined, undefined])
  })

  it('una tabla anidada se quita volviendo su celda a texto', () => {
    const [[a]] = cellIds()
    state().setCellContentKind(a, 'table')
    const content = findCell(state().design as PdfDesign, a)?.cell.content
    if (content?.kind !== 'table') throw new Error('no anido')
    later()
    state().removeTable(content.table.id)

    expect(findCell(state().design as PdfDesign, a)?.cell.content).toEqual({
      kind: 'text',
      text: '',
    })
    expect(state().selection).toMatchObject({ focusCellId: a })
  })
})

describe('hojas y clases', () => {
  it('agregar una hoja la activa; quitar la activa vuelve a la primera', () => {
    state().addSheet()
    const second: string = state().design?.sheets[1].id ?? ''
    expect(state().activeSheetId).toBe(second)

    later()
    state().removeSheet(second)
    expect(state().activeSheetId).toBe(state().design?.sheets[0].id)
  })

  it('deshacer una hoja nueva repara la hoja activa', () => {
    state().addSheet()
    later()
    state().undo()

    expect(state().design?.sheets).toHaveLength(1)
    expect(state().activeSheetId).toBe(state().design?.sheets[0].id)
  })

  it('crear una clase la abre en el editor; renombrarla mantiene el editor', () => {
    const name: string | null = state().addClass()

    expect(name).toBe('clase1')
    expect(state()).toMatchObject({ editingClass: 'clase1', sidebarTab: 'document' })
    later()
    state().renameClass('clase1', 'titulo')
    expect(state().editingClass).toBe('titulo')
    expect(state().design?.classes.map((item) => item.name)).toEqual(['titulo'])
  })

  it('crear una clase desde la selección sin celdas no hace nada', () => {
    state().clearSelection()

    expect(state().createClassFromSelection()).toBeNull()
  })
})
