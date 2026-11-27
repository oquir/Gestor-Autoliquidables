// Pellizco con dos dedos (lib/canvasZoom, usePinchZoom). Coordenadas de cliente, en px.
export interface PinchPoint {
  x: number
  y: number
}

// Un cuadro del gesto: cuanto crecio desde que se apoyaron los dos dedos y donde esta su punto
// medio ahora (el ancla del zoom).
export interface PinchFrame {
  scale: number
  midpoint: PinchPoint
}
