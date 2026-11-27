import { Link } from 'react-router'
import {
  correctionChain,
  currentOfChain,
  correctionStatusLabel,
  correctionTone,
  declarationTypeText,
  formatDate,
  formatPesos,
  isDownwardCorrection,
  useCorrectionApplication,
} from '../../../../lib'
import { Badge, Card } from '../../../atoms'
import { CardHeader } from '../../../molecules'
import type { DeclarationChainProps } from './DeclarationChain.types'

/**
 * La inicial y todas las correcciones del mismo periodo, en orden, con la que está vigente marcada. Cada fila lleva a
 * su detalle, para moverse por la cadena sin volver al listado.
 */
export default function DeclarationChain({ d, declarations }: DeclarationChainProps) {
  const correction = useCorrectionApplication()
  const chain = correctionChain(d, declarations)
  if (chain.length < 2) return null
  const current = currentOfChain(chain, correction)

  return (
    <Card>
      <CardHeader
        title="Declaraciones del periodo"
        description="La inicial y todas sus correcciones, en orden."
        actions={<Badge tone="neutral">{chain.length} declaraciones</Badge>}
      />
      <ol className="divide-y divide-border-subtle">
        {chain.map((x, i) => {
          const corrected = x.correctsId
            ? declarations.find((y) => y.id === x.correctsId)
            : undefined
          const situation = correction(x)
          const isCurrent = current?.id === x.id
          return (
            <li key={x.id} className={isCurrent ? 'bg-surface-sunken' : undefined}>
              <Link
                to={`/declaraciones/${x.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-sunken"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg-strong">
                    {declarationTypeText(x.kind, isDownwardCorrection(x, corrected))}
                    {isCurrent ? (
                      <Badge tone="success">Vigente</Badge>
                    ) : (
                      x.kind === 'initial' && <Badge tone="neutral">Reemplazada</Badge>
                    )}
                    {situation && (
                      <Badge tone={correctionTone[situation.status]}>
                        Solicitud {correctionStatusLabel[situation.status].toLowerCase()}
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {`${i + 1} de ${chain.length} · ${x.number} · presentada el ${formatDate(x.filingDate)}`}
                    {x.id === d.id && (
                      <span className="font-medium text-brand-fg"> · estás aquí</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-fg">
                  {formatPesos(x.totalToPay)}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
