import type { AriaRole, ReactNode } from 'react'
import type { BottomSheetSize } from '../../../types'

export interface MenuSurfaceProps {
  // Titulo de la hoja en el celular; el menu flotante no lo muestra (ya lo dice su boton).
  title: string
  onClose: () => void
  // Las clases de siempre del menu flotante (posicion, caja, sombra, animacion).
  popoverClassName: string
  // Como se acomoda el contenido dentro de la hoja (la caja la pone la hoja).
  sheetContentClassName?: string
  sheetSize?: BottomSheetSize
  // El de la lista de opciones (menu), en el flotante y dentro de la hoja.
  role?: AriaRole
  children: ReactNode
}
