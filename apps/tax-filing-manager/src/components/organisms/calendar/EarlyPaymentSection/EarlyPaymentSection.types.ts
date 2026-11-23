import type { SettingsEdit } from '../../../../types'

export interface EarlyPaymentSectionProps extends SettingsEdit {
  /** Año gravable que se ve en toda la sección de Calendario: lo decide Vencimientos. */
  fiscalYear: number
}
