import type { CanvasRow } from '../../types'
import type { FieldRename } from '../../types'
import { FALLBACK_NAME, RESERVED_FIELD_NAMES } from './fieldName.constants'

// La identidad del campo hacia afuera: unico y valido como identificador (sin acentos ni digito
// inicial).

export function slugifyFieldName(label: string): string {
  const withoutAccents: string = label.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const slug: string = withoutAccents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  if (slug.length === 0) return FALLBACK_NAME
  if (/^[0-9]/.test(slug)) return `${FALLBACK_NAME}_${slug}`
  if (RESERVED_FIELD_NAMES.has(slug)) return `${slug}_${FALLBACK_NAME}`

  return slug
}

export function uniqueFieldName(candidate: string, taken: Set<string>): string {
  if (!taken.has(candidate)) return candidate

  let suffix = 2
  while (taken.has(`${candidate}_${suffix}`)) suffix += 1

  return `${candidate}_${suffix}`
}

export function collectFieldNames(rows: CanvasRow[], exceptFieldId?: string): Set<string> {
  const names = new Set<string>()

  for (const row of rows) {
    for (const field of row.fields) {
      if (field.id === exceptFieldId) continue
      names.add(field.name)
    }
  }

  return names
}

// Segunda defensa del nombre unico (borradores manipulados o viejos): el primero conserva el nombre
// y el repetido se renombra y se reporta en renamed.
export function migrateFieldNames(
  rows: CanvasRow[],
  taken: Set<string>,
  renamed: FieldRename[] = [],
): CanvasRow[] {
  return rows.map((row) => ({
    ...row,
    fields: row.fields.map((field) => {
      // Un nombre reservado de un borrador viejo o editado a mano se renombra y se reporta.
      const candidate: string =
        field.name && !RESERVED_FIELD_NAMES.has(field.name)
          ? field.name
          : slugifyFieldName(field.name || field.label)
      const name: string = uniqueFieldName(candidate, taken)
      taken.add(name)

      // Rellenar un nombre que faltaba no es un renombre.
      if (field.name && name !== field.name) {
        renamed.push({ from: field.name, to: name, label: field.label })
      }

      return field.name === name ? field : { ...field, name }
    }),
  }))
}
