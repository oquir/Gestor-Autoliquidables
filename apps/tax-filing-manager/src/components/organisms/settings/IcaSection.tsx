import { number, MAX_ADVANCE } from '../../../lib'
import type { SettingsEdit, Tax } from '../../../types'
import { Input } from '../../atoms'
import { Field, Toggle, Section } from '../../molecules'

interface IcaSectionProps extends SettingsEdit {
  taxes: Record<Tax, boolean>
}

/** ICA anual: anticipo y sobretasa bomberil. El descuento por pronto pago está en la página Calendario. */
export default function IcaSection({ b, change, editable, errors, taxes }: IcaSectionProps) {
  const withSelfWithholding = taxes.selfWithholding && !b.disabledForms.selfWithholding
  return (
    <Section
      title="ICA anual"
      description="Cobros que fija el concejo municipal. El descuento por pronto pago se pone en Calendario."
    >
      {/* Anticipo */}
      <Field
        label="Anticipo del año siguiente (%)"
        help="0 si el municipio no lo exige."
        error={errors.anticipo}
      >
        <Input
          type="number"
          min={0}
          max={MAX_ADVANCE}
          disabled={!editable}
          value={b.advancePercentage}
          onChange={(e) => change({ advancePercentage: number(e.target.value) })}
        />
      </Field>

      {/* Sobretasa bomberil */}
      <div className="space-y-3">
        <Toggle
          label="Sobretasa bomberil"
          help="Se cobra en el renglón 23 como porcentaje del impuesto de industria y comercio."
          value={b.fireSurcharge.active}
          isDisabled={!editable}
          onChange={(v) => change({ fireSurcharge: { ...b.fireSurcharge, active: v } })}
        />
        {b.fireSurcharge.active && (
          <div className="ml-12">
            <Field label="Porcentaje de la sobretasa (% del ICA)" error={errors.sobretasa}>
              <Input
                type="number"
                min={0}
                step="0.1"
                disabled={!editable}
                value={b.fireSurcharge.percentage}
                onChange={(e) =>
                  change({
                    fireSurcharge: {
                      ...b.fireSurcharge,
                      percentage: number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          </div>
        )}
      </div>

      {/* Sobretasa de seguridad */}
      <div className="space-y-3">
        <Toggle
          label="Sobretasa de seguridad"
          help="Se cobra en el renglón 24 como porcentaje del impuesto de industria y comercio."
          value={b.securitySurcharge.active}
          isDisabled={!editable}
          onChange={(v) => change({ securitySurcharge: { ...b.securitySurcharge, active: v } })}
        />
        {b.securitySurcharge.active && (
          <div className="ml-12">
            <Field
              label="Porcentaje de la sobretasa (% del ICA)"
              error={errors.sobretasaSeguridad ?? errors.sobretasa}
            >
              <Input
                type="number"
                min={0}
                step="0.1"
                disabled={!editable}
                value={b.securitySurcharge.percentage}
                onChange={(e) =>
                  change({
                    securitySurcharge: {
                      ...b.securitySurcharge,
                      percentage: number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          </div>
        )}
      </div>

      {/* Pago volunatrio */}
      <div className="space-y-3">
        <Toggle
          label="Pago voluntario"
          help="Habilita los renglones 39 y 40 en la declaración para aportes voluntarios."
          value={b.voluntaryContribution.active}
          isDisabled={!editable}
          onChange={(v) =>
            change({ voluntaryContribution: { ...b.voluntaryContribution, active: v } })
          }
        />

        {b.voluntaryContribution.active && (
          <div className="ml-12 space-y-4">
            {/* Selector de modalidad (Radio buttons) */}
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">Modalidad de aporte</span>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="voluntary-mode"
                    value="free"
                    disabled={!editable}
                    checked={b.voluntaryContribution.mode === 'free'}
                    onChange={() =>
                      change({
                        voluntaryContribution: {
                          ...b.voluntaryContribution,
                          mode: 'free',
                        },
                      })
                    }
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Monto libre
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="voluntary-mode"
                    value="percentage"
                    disabled={!editable}
                    checked={b.voluntaryContribution.mode === 'percentage'}
                    onChange={() =>
                      change({
                        voluntaryContribution: {
                          ...b.voluntaryContribution,
                          mode: 'percentage',
                        },
                      })
                    }
                    className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Porcentaje sugerido (% del ICA)
                </label>
              </div>
            </div>

            {/* Campo condicional si elige porcentaje sugerido */}
            {b.voluntaryContribution.mode === 'percentage' && (
              <Field label="Porcentaje sugerido (%)" error={errors.pagoVoluntario}>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  disabled={!editable}
                  value={b.voluntaryContribution.suggestedPercentage}
                  onChange={(e) =>
                    change({
                      voluntaryContribution: {
                        ...b.voluntaryContribution,
                        suggestedPercentage: number(e.target.value),
                      },
                    })
                  }
                />
              </Field>
            )}

            {/* Checkbox para solicitar destino del aporte */}
            <label className="flex cursor-pointer items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                disabled={!editable}
                checked={b.voluntaryContribution.requestDestination}
                onChange={(e) =>
                  change({
                    voluntaryContribution: {
                      ...b.voluntaryContribution,
                      requestDestination: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="text-sm leading-tight">
                <span className="font-medium text-slate-700">Solicitar destino del aporte</span>
                <p className="mt-0.5 text-xs text-slate-500">
                  Muestra un campo para que el declarante indique a qué proyecto se dirige.
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Cruce de autorretenciones */}
      <div className="space-y-3">
        <Toggle
          label="Cruce de autorretenciones"
          help={
            withSelfWithholding
              ? 'Pertenece al renglón 28 que corresponde a Menos autorretenciones.'
              : 'Requiere tener activo el formulario de AutoReteICA.'
          }
          value={withSelfWithholding && b.crossCheckSelfWithholdings}
          isDisabled={!editable || !withSelfWithholding}
          onChange={(v) => change({ crossCheckSelfWithholdings: v })} 
        />
      </div>
    </Section>
  )
}
