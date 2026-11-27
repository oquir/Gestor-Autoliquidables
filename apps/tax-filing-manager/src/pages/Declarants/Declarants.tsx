import { useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import { Card } from '../../components/atoms'
import {
  DateQueryBar,
  EmptyState,
  FilterBar,
  SearchBox,
  Filter,
  SelectableIndicator,
  PageHeader,
} from '../../components/molecules'
import { MunicipalitySearch, DeclarantsTable } from '../../components/organisms'
import {
  inDateRange,
  lodgingDate,
  can,
  withRit,
  ofMunicipality,
  ritVisible,
  useDateQuery,
  useSession,
} from '../../lib'
import { useData } from '../../store'
import type { Capacity, PersonType, FilterValue } from '../../types'
import {
  CAPACITIES,
  CAPACITY_OPTIONS,
  PERSON_TYPE_OPTIONS,
  PLURAL,
  CRITERION,
  NO_QUERY,
  NO_RIT,
} from './Declarants.constants'

export default function Declarants() {
  const { user, municipalityId } = useSession()
  const canSeeAll = can(user?.role, 'canSeeAllMunicipalities')
  const allItems = useData((s) => s.registrations)
  const municipalities = useData((s) => s.municipalities)
  const [text, setText] = useState('')
  const [personType, setPersonType] = useState<FilterValue<PersonType>>('')
  const [capacity, setCapacity] = useState<FilterValue<Capacity>>('')
  // Los declarantes solo salen después de consultar un rango de fechas de radicación.
  const { query, consult } = useDateQuery('declarants')

  const declarants = useMemo(
    () =>
      query
        ? ofMunicipality(allItems, municipalityId)
            .filter(withRit(municipalities))
            .filter((i) => inDateRange(lodgingDate(i), query))
        : [],
    [allItems, municipalities, municipalityId, query],
  )

  const filteredItems = useMemo(() => {
    const term = text.trim().toLowerCase()
    return declarants.filter(
      (i) =>
        (!term ||
          i.name.toLowerCase().includes(term) ||
          i.document.includes(term) ||
          i.ritNumber.includes(term)) &&
        (!personType || i.personType === personType) &&
        (!capacity || i.capacities.some((c) => c.capacity === capacity)),
    )
  }, [declarants, text, personType, capacity])

  const withRitVisible = ritVisible(municipalities, municipalityId)
  // El municipio sin RIT manda a Inicio; 1cero1 se queda para elegir otro municipio sin salir de la vista.
  if (!withRitVisible && !canSeeAll) return <Navigate to="/" replace />
  const count = (c: Capacity) =>
    declarants.filter((i) => i.status === 'active' && i.capacities.some((q) => q.capacity === c))
      .length

  return (
    <>
      <PageHeader
        title="Declarantes"
        description="Sujetos inscritos en el Registro de Información Tributaria que presentan declaraciones: personas naturales, empresas y demás sujetos, con la calidad en que actúan."
      />
      <DateQueryBar query={query} consult={consult} criterion={CRITERION}>
        {canSeeAll && <MunicipalitySearch inline />}
      </DateQueryBar>

      {!withRitVisible ? (
      <Card>
        <EmptyState title={NO_RIT.title} description={NO_RIT.description} />
      </Card>
      ) : !query ? (
        <Card>
          <EmptyState title={NO_QUERY.title} description={NO_QUERY.description} />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {CAPACITIES.map((c) => (
              <SelectableIndicator
                key={c}
                label={`${PLURAL[c]} activos`}
                value={count(c)}
                isActive={capacity === c}
                onClick={() => setCapacity(capacity === c ? '' : c)}
              />
            ))}
          </div>

          <Card>
            <FilterBar
              searchBox={
                <SearchBox
                  placeholder="Buscar por nombre, documento o número de RIT"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              }
            >
              <Filter
                label="Tipo de persona"
                options={PERSON_TYPE_OPTIONS}
                value={personType}
                change={setPersonType}
              />
              <Filter
                label="Calidad"
                options={CAPACITY_OPTIONS}
                value={capacity}
                change={setCapacity}
              />
            </FilterBar>

            <DeclarantsTable declarants={filteredItems} total={declarants.length} />
          </Card>
        </>
      )}
    </>
  )
}
