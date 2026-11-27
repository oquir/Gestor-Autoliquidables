import { TOUCH_TARGET_CLASSES } from '../../../constants/uiClasses'
import { Tooltip } from '../Tooltip'
import type { IconButtonProps } from './IconButton.types'

// El title se pinta con Tooltip y, si no hay aria-label, pasa a ser el nombre accesible.
export function IconButton({
  className = '',
  children,
  title,
  touchTarget = true,
  'aria-label': ariaLabel,
  ...rest
}: IconButtonProps) {
  const button = (
    <button
      type="button"
      className={touchTarget ? `${TOUCH_TARGET_CLASSES} ${className}` : className}
      aria-label={ariaLabel ?? title}
      {...rest}
    >
      {children}
    </button>
  )

  return title ? <Tooltip content={title}>{button}</Tooltip> : button
}
