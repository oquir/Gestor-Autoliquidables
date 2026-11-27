export interface PortSize {
  width: number
  height: number
}

// Un punto del documento en pixeles de maquetacion, medido desde su esquina superior izquierda
// (x, y), y donde tiene que quedar dentro del puerto visible (viewX, viewY): el centro, o el punto
// medio de los dedos al pellizcar.
export interface ViewAnchor {
  x: number
  y: number
  viewX: number
  viewY: number
}

// Para que documento y que paso se hizo la ultima vuelta al inicio.
export interface HomedView {
  content: HTMLDivElement
  canvasKey: string
}
