import type { PinchFrame } from '../../types'

export interface PinchZoomHandlers {
  // Se apoyaron los dos dedos: quien usa el hook anota el zoom de partida.
  onStart: () => void
  // A lo sumo uno por cuadro, con la escala contra el comienzo y el punto medio actual.
  onPinch: (frame: PinchFrame) => void
}
