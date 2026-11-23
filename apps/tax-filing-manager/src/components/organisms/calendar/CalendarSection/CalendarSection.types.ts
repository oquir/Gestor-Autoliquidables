import type { MunicipalityConfig, SettingsEdit, Tax } from '../../../../types'

export interface CalendarSectionProps extends SettingsEdit {
  /** Formularios que el municipio tiene activos: solo de esos se ponen vencimientos. */
  taxes: Record<Tax, boolean>
  /** Configuración guardada, sin los cambios del borrador: de ahí sale el PDF. */
  config: MunicipalityConfig
  /** Año gravable que se ve */
  fiscalYear: number
  /** Cambia el año gravable de toda la sección de Calendario. */
  onFiscalYear: (year: number | undefined) => void
}
