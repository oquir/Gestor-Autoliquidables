import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob } from '../../src/lib/fileDownload'
import { DOWNLOAD_URL_TTL_MS } from '../../src/lib/fileDownload/fileDownload.constants'

// Sin DOM (entorno node): document, URL y window se reemplazan por lo minimo que usa downloadBlob.
interface FakeAnchor {
  href: string
  download: string
  style: { display: string }
  click: () => void
  remove: () => void
}

let events: string[] = []
let anchors: FakeAnchor[] = []

beforeEach(() => {
  vi.useFakeTimers()
  events = []
  anchors = []
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('document', {
    createElement: (): FakeAnchor => {
      const anchor: FakeAnchor = {
        href: '',
        download: '',
        style: { display: '' },
        click: () => events.push(`click:${anchor.download}`),
        remove: () => events.push('remove'),
      }
      anchors.push(anchor)
      return anchor
    },
    body: { appendChild: () => events.push('append') },
  })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
    events.push(`revoke:${url}`)
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('downloadBlob', () => {
  it('descarga con el nombre dado desde un enlace dentro del documento', () => {
    downloadBlob(new Blob(['{}']), 'ica.json')

    expect(anchors).toHaveLength(1)
    expect(anchors[0].href).toBe('blob:fake')
    expect(events).toEqual(['append', 'click:ica.json', 'remove'])
  })

  // Chrome de Android lee el blob despues de click(): soltarlo enseguida deja la descarga fallida.
  it('no suelta el enlace del blob hasta pasado el plazo', () => {
    downloadBlob(new Blob(['<html></html>']), 'ica_v2.html')

    vi.advanceTimersByTime(DOWNLOAD_URL_TTL_MS - 1)
    expect(events).not.toContain('revoke:blob:fake')

    vi.advanceTimersByTime(1)
    expect(events).toContain('revoke:blob:fake')
  })
})
