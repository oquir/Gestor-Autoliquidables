import type { PointerSensorOptions, TouchSensorOptions } from '@dnd-kit/core'

export const DRAG_ACTIVATION_DISTANCE_PX: number = 4

// De modulo y no en linea: con un objeto nuevo en cada render, useSensor armaba otro sensor, dnd-kit
// otros activadores, y su contexto cambiaba para todos los arrastrables (con listeners nuevos)
// cada vez que FormBuilder se repintaba, al empezar y al terminar cada arrastre (auditoria O2).
export const POINTER_SENSOR_OPTIONS: PointerSensorOptions = {
  activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
}

// Con el dedo se arrastra dejandolo quieto un momento: si se mueve antes, es desplazar la paleta o
// el lienzo (T2 de docs/Plan-Movil.md). De modulo por lo mismo que el de arriba.
export const TOUCH_SENSOR_OPTIONS: TouchSensorOptions = {
  activationConstraint: { delay: 200, tolerance: 8 },
}

// Con el dedo la copia que se arrastra va encima de la yema y no debajo, donde el dedo la tapa
// (T3 de docs/Plan-Movil.md): su borde de abajo queda a esta distancia del punto de contacto.
export const FINGER_LIFT_PX: number = 24
