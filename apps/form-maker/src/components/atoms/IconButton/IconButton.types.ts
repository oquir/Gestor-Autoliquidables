import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  // Area de toque de 44px en tactil (por defecto). En false para lo que se oculta con opacidad o
  // tiene z-index propio: su area extra robaria los toques de al lado.
  touchTarget?: boolean
}
