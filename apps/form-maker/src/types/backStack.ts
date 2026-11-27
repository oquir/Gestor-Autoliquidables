// La pila del boton Atras (lib/backStack): las capas abiertas, de abajo hacia arriba.

export interface BackLayerClose {
  stack: string[]
  // La capa seguia en la pila (se cerro desde la interfaz): hay que gastar su entrada del historial.
  goBack: boolean
}

export interface BackLayerPop {
  stack: string[]
  // Las que el Atras dejo por encima del piso, de arriba hacia abajo.
  closing: string[]
}

// Lo que va en history.state de cada entrada que agrega una capa.
export interface BackEntryState {
  formMakerBackDepth: number
}
