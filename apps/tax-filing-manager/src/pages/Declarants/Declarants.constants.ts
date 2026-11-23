import { capacityLabel, personTypeLabel } from '../../lib'
import type { Capacity, PersonType, FilterValue } from '../../types'

/** Las calidades, en el orden de los indicadores. */
export const CAPACITIES: Capacity[] = ['taxpayer', 'withholding_agent', 'self_withholder']

export const PLURAL: Record<Capacity, string> = {
  taxpayer: 'Contribuyentes',
  withholding_agent: 'Agentes retenedores',
  self_withholder: 'Autorretenedores',
}

export const PERSON_TYPE_OPTIONS: Record<FilterValue<PersonType>, string> = {
  '': 'Todo tipo de persona',
  ...personTypeLabel,
}
export const CAPACITY_OPTIONS: Record<FilterValue<Capacity>, string> = {
  '': 'Toda calidad',
  ...capacityLabel,
}

/** Con qué fecha se filtra la consulta. */
export const CRITERION = 'Por la fecha en que se radicó la solicitud de inscripción.'

/** Lo que se muestra mientras no se ha consultado un rango de fechas. */
export const NO_QUERY = {
  title: 'Elige el rango de fechas',
  description: 'Escoge desde y hasta y presiona Consultar para ver los declarantes.',
}
