import type { PointerSensorOptions } from '@dnd-kit/core'

export const DRAG_ACTIVATION_DISTANCE_PX: number = 4

// De modulo y no en linea: con un objeto nuevo en cada render, useSensor armaba otro sensor, dnd-kit
// otros activadores, y su contexto cambiaba para todos los arrastrables (con listeners nuevos)
// cada vez que FormBuilder se repintaba, al empezar y al terminar cada arrastre (auditoria O2).
export const POINTER_SENSOR_OPTIONS: PointerSensorOptions = {
  activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX },
}
