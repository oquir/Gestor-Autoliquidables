export interface ViewportInput {
  portWidth: number
  portHeight: number
  zoom: number
  panelsCollapsed: boolean
  minDocumentWidth?: number
}

// px del puerto. home*: scroll con el documento centrado y su borde superior a la vista.
export interface ViewportLayout {
  documentWidth: number
  rootWidth: number
  rootMinHeight: number
  paddingTop: number
  paddingBottom: number
  homeLeft: number
  homeTop: number
  // Margen izquierdo del documento cuando es mas ancho que la raiz (negativo); 0 si mx-auto basta.
  documentShift: number
}
