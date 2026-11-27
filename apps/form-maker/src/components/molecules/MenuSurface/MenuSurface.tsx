import { useLayoutMode } from '../../../hooks'
import { BottomSheet } from '../BottomSheet'
import type { MenuSurfaceProps } from './MenuSurface.types'

// Lo que se abre encima de un boton: en el celular sale como hoja de abajo (B7 de
// docs/Plan-Movil.md), en lo demas es el menu flotante de siempre. Quien lo usa tiene que apagar su
// useClickOutside en el celular: la hoja va en un portal y un toque adentro contaria como afuera.
export function MenuSurface({
  title,
  onClose,
  popoverClassName,
  sheetContentClassName = 'flex flex-col gap-2',
  sheetSize = 'half',
  role,
  children,
}: MenuSurfaceProps) {
  const isPhone: boolean = useLayoutMode() === 'phone'

  if (isPhone) {
    return (
      <BottomSheet title={title} onClose={onClose} size={sheetSize}>
        <div role={role} className={sheetContentClassName}>
          {children}
        </div>
      </BottomSheet>
    )
  }

  return (
    <div role={role} className={popoverClassName}>
      {children}
    </div>
  )
}
