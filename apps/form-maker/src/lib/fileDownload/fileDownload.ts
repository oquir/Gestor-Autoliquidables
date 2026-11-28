import { DOWNLOAD_URL_TTL_MS } from './fileDownload.constants'

// Descarga un Blob con un <a download> (toca el DOM). La usan Exportar (.json) y Descargar HTML del
// PDF. El enlace se suelta tarde y no despues del click: Chrome de Android (y Safari) leen el blob
// despues de que click() vuelve, y si ya se solto la descarga sale fallida o vacia. Es el mismo
// respaldo de 40 s de FileSaver.js.
export function downloadBlob(blob: Blob, fileName: string): void {
  const url: string = URL.createObjectURL(blob)
  const anchor: HTMLAnchorElement = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  // En el documento: Firefox ignora el click de un enlace suelto.
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_TTL_MS)
}
