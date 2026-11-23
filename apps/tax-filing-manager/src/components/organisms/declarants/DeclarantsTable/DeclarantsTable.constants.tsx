import { Link } from 'react-router'
import { AddressCard } from 'reicon-react'
import { ROW_BUTTON_CLASS } from '../../../../constants'
import { capacityLabel, personTypeLabel, documentFormat, statementPath } from '../../../../lib'
import { Badge } from '../../../atoms'
import { col } from './DeclarantsTable.utils'

export const COLUMNS = col.columns([
  col.accessor('ritNumber', {
    header: 'RIT',
    meta: { classes: 'whitespace-nowrap' },
    // Lleva al estado de cuenta del contribuyente: el mismo destino del botón "Estado de cuenta".
    cell: ({ row: { original: i } }) => (
      <Link
        to={statementPath(i.municipalityId, i)}
        aria-label={`Ver el estado de cuenta de ${i.name}`}
        className={ROW_BUTTON_CLASS}
      >
        <AddressCard className="size-4 text-brand-fg" aria-hidden />
        {i.ritNumber}
      </Link>
    ),
  }),
  col.accessor('name', {
    header: 'Nombre o razón social',
    meta: { classes: 'min-w-72' },
    cell: ({ row: { original: i } }) => <p className="font-medium text-fg-strong">{i.name}</p>,
  }),
  col.accessor((i) => documentFormat(i), {
    id: 'idDocument',
    header: 'Documento',
    meta: { classes: 'whitespace-nowrap tabular-nums text-fg' },
  }),
  col.accessor((i) => personTypeLabel[i.personType], {
    id: 'tipoPersona',
    header: 'Tipo de persona',
    meta: { classes: 'whitespace-nowrap text-fg' },
  }),
  col.display({
    id: 'capacities',
    header: () => <div className="w-full text-center">Calidades</div>,
    cell: ({ row: { original: i } }) => (
      <div className="flex flex-wrap gap-1">
        {i.capacities.map((c) => (
          <Badge key={c.capacity} tone={c.capacity === 'taxpayer' ? 'neutral' : 'info'}>
            {capacityLabel[c.capacity]}
          </Badge>
        ))}
        {i.simpleRegime && <Badge>SIMPLE</Badge>}
      </div>
    ),
  }),
])
