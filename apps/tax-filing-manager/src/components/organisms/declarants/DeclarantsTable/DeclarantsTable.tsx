import { useMemo } from 'react'
import { useSession } from '../../../../lib'
import { useData } from '../../../../store'
import Table from '../../Table'
import { municipalityColumn } from '../../registrations/RegistrationsTable/RegistrationsTable.utils'
import { COLUMNS } from './DeclarantsTable.constants'
import type { DeclarantsTableProps } from './DeclarantsTable.types'
import { col } from './DeclarantsTable.utils'

/** Declarantes inscritos en el RIT. Cuando 1cero1 mira todos los municipios, agrega la columna de municipio. */
export default function DeclarantsTable({ declarants, total }: DeclarantsTableProps) {
  const { municipalityId } = useSession()
  const municipalities = useData((s) => s.municipalities)
  const columns = useMemo(
    () =>
      municipalityId === null
        ? col.columns([...COLUMNS, municipalityColumn(municipalities)])
        : COLUMNS,
    [municipalityId, municipalities],
  )

  return (
    <Table
      data={declarants}
      columns={columns}
      perPage={15}
      rowId={(i) => i.id}
      name={`declarantes (de ${total})`}
      empty="No hay declarantes con esos filtros"
    />
  )
}
