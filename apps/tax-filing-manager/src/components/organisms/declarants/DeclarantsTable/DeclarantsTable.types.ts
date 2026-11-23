import type { Registration } from '../../../../types'

export interface DeclarantsTableProps {
  declarants: Registration[]
  /** Cuántos hay sin filtrar, para el pie de la tabla. */
  total: number
}
