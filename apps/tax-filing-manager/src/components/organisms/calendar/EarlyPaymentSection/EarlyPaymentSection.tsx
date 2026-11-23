import { Xmark } from 'reicon-react'
import { number } from '../../../../lib'
import type { EarlyPaymentTier } from '../../../../types'
import { Button, Input } from '../../../atoms'
import { Toggle, Section } from '../../../molecules'
import { TIER_COLUMNS } from './EarlyPaymentSection.constants'
import type { EarlyPaymentSectionProps } from './EarlyPaymentSection.types'

export default function EarlyPaymentSection({
  b,
  change,
  editable,
  errors,
  fiscalYear,
}: EarlyPaymentSectionProps) {
  const value = b.earlyPayment
  const tiers = value.byFiscalYear.find((v) => v.fiscalYear === fiscalYear)?.tiers ?? []

  const changeTiers = (newOnes: EarlyPaymentTier[]) => {
    if (fiscalYear === undefined) return
    // Si el año todavía no tiene tramos (se agregó en Vencimientos o se activó el descuento después),
    // el primer tramo lo crea: antes hacía falta el botón "Agregar año gravable" de aquí.
    const exists = value.byFiscalYear.some((v) => v.fiscalYear === fiscalYear)
    change({
      earlyPayment: {
        ...value,
        byFiscalYear: exists
          ? value.byFiscalYear.map((v) =>
              v.fiscalYear === fiscalYear ? { ...v, tiers: newOnes } : v,
            )
          : [...value.byFiscalYear, { fiscalYear, tiers: newOnes }],
      },
    })
  }
  const changeTier = (i: number, partial: Partial<EarlyPaymentTier>) =>
    changeTiers(tiers.map((t, j) => (j === i ? { ...t, ...partial } : t)))

  console.log('EarlyPayment debug:', {
    isActive: value.isActive,
    fiscalYear,
    byFiscalYear: value.byFiscalYear,
    tiers,
  })

  return (
    <Section
      title="Descuento por pronto pago"
      description="Fechas de pago y porcentaje de descuento del ICA anual en cada año gravable. Solo sobre el impuesto neto; se pierde con pago parcial o extemporáneo."
    >
      <div className="sm:col-span-2">
        <Toggle
          label="El municipio da descuento por pronto pago"
          help="Lo fija el concejo para cada año gravable; por fuera de los tramos no hay descuento."
          value={value.isActive}
          isDisabled={!editable}
          onChange={(isActive) => change({ earlyPayment: { ...value, isActive } })}
        />
      </div>
      {value.isActive && (
        <div className="space-y-4 sm:col-span-2">
          {fiscalYear === undefined ? (
            <p className="text-sm text-fg-muted">
              Agrega un año gravable en Vencimientos para poner sus tramos.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-fg-muted">
                El año gravable {fiscalYear} se declara en {fiscalYear + 1}. El descuento depende de
                la fecha de pago; por fuera de estos tramos no hay descuento.
              </p>
              {tiers.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  Sin tramos: este año gravable no tiene descuento.
                </p>
              ) : (
                <div className={`${TIER_COLUMNS} text-xs font-medium text-fg-muted`}>
                  <span>Pago desde</span>
                  <span>Pago hasta</span>
                  <span>Descuento (%)</span>
                </div>
              )}
              {tiers.map((t, i) => {
                const error = errors[`pronto-${fiscalYear}-${i}`]
                return (
                  <div key={i}>
                    <div className={`${TIER_COLUMNS} items-center`}>
                      <Input
                        type="date"
                        aria-label={`Inicio del tramo ${i + 1}`}
                        disabled={!editable}
                        value={t.from}
                        onChange={(e) => changeTier(i, { from: e.target.value })}
                      />
                      <Input
                        type="date"
                        aria-label={`Fin del tramo ${i + 1}`}
                        disabled={!editable}
                        value={t.to}
                        onChange={(e) => changeTier(i, { to: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        aria-label={`Descuento del tramo ${i + 1}`}
                        disabled={!editable}
                        value={t.percentage}
                        onChange={(e) => changeTier(i, { percentage: number(e.target.value) })}
                      />
                      {editable && (
                        <Button
                          variant="ghost"
                          className="px-2"
                          aria-label={`Quitar el tramo ${i + 1}`}
                          onClick={() => changeTiers(tiers.filter((_, j) => j !== i))}
                        >
                          <Xmark className="size-4" aria-hidden />
                        </Button>
                      )}
                    </div>
                    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
                  </div>
                )
              })}

              {editable && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => changeTiers([...tiers, { from: '', to: '', percentage: 0 }])}
                >
                  + Agregar tramo
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Section>
  )
}
