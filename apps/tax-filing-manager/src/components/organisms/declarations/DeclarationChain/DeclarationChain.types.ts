import type { Declaration } from '../../../../types'

export interface DeclarationChainProps {
  /** La declaración que se está viendo. */
  d: Declaration
  /** Todas las declaraciones, para armar la cadena del periodo al que pertenece `d`. */
  declarations: Declaration[]
}
