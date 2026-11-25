// Lo que el runtime inyecta en cada script, como parametros sueltos (sum(x), no lib.sum(x)) para
// que el editor los ofrezca.

// Lo que no sea un numero legible vale 0. Es semantica del lenguaje: el consumidor la copia.
export function toScriptNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'boolean') return value ? 1 : 0

  if (typeof value === 'string') {
    const trimmed: string = value.trim()
    if (trimmed.length === 0) return 0
    const parsed: number = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

// Aplana un nivel: la columna de un grupo llega como array, y sum({{x}}) y sum(a, b) son la misma
// llamada.
function toNumbers(args: unknown[]): number[] {
  const flat: number[] = []

  for (const arg of args) {
    if (Array.isArray(arg)) {
      for (const item of arg) flat.push(toScriptNumber(item))
      continue
    }

    flat.push(toScriptNumber(arg))
  }

  return flat
}

// Magnitud y signo, como lib/fieldRounding: Math.round desempata hacia +infinito y rompia la
// simetria con negativos (round(-2.5) daba -2). El + 0 mata el -0.
function roundTo(value: number, decimals: number): number {
  const factor: number = 10 ** Math.trunc(decimals)
  const rounded: number = Math.round(Math.abs(value) * factor) / factor
  return (value < 0 ? -rounded : rounded) + 0
}

// El NIT suele llegar escrito con puntos ("900.123.456"): parseFloat se quedaria en 900,123 y el DV
// saldria mal sin aviso. Lo que viene tras un guion (el DV ya escrito) lo corta parseFloat.
function nitNumber(value: unknown): number {
  if (typeof value !== 'string') return toScriptNumber(value)
  return toScriptNumber(value.replace(/[.,\s]/g, ''))
}

// Pesos oficiales DIAN, de derecha a izquierda sobre las cifras del NIT.
const DV_WEIGHTS: number[] = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]

function digitoVerificacion(nit: number): number {
  if (!Number.isFinite(nit)) return 0

  const digits: string = String(Math.trunc(Math.abs(nit)))
  let total = 0

  for (let i = 0; i < digits.length && i < DV_WEIGHTS.length; i += 1) {
    total += Number(digits[digits.length - 1 - i]) * DV_WEIGHTS[i]
  }

  const remainder: number = total % 11

  return remainder < 2 ? remainder : 11 - remainder
}

export const SCRIPT_HELPERS: Record<string, (...args: unknown[]) => number> = {
  num: (...args) => toScriptNumber(args[0]),
  sum: (...args) => toNumbers(args).reduce((total, value) => total + value, 0),
  count: (...args) => toNumbers(args).length,
  abs: (...args) => Math.abs(toScriptNumber(args[0])),
  min: (...args) => Math.min(...toNumbers(args)),
  max: (...args) => Math.max(...toNumbers(args)),
  round: (...args) =>
    roundTo(toScriptNumber(args[0]), args.length > 1 ? toScriptNumber(args[1]) : 0),
  floor: (...args) => Math.floor(toScriptNumber(args[0])),
  ceil: (...args) => Math.ceil(toScriptNumber(args[0])),
  dvNit: (...args) => digitoVerificacion(nitNumber(args[0])),
}

// Solo los nombres: la implementacion vive en lib/scriptDates (constants no importa lib). Son
// contrato con el consumidor: compiled los llama por nombre.
export const DATE_HELPER_NAMES: string[] = ['fechaLimite', 'diasDeMora', 'mesesDeMora']

// UVT y SMMLV del ano (lib/scriptValores). Devuelven null y no 0 si falta el ano: el autor pone el
// respaldo con uvt() ?? 52374.
export const VALUE_HELPER_NAMES: string[] = ['uvt', 'smmlv']

// Los que necesitan el RuntimeContext, en orden de paso: nombres y valores no pueden desalinearse.
export const CONTEXT_HELPER_NAMES: string[] = [...DATE_HELPER_NAMES, ...VALUE_HELPER_NAMES]

export const SCRIPT_HELPER_NAMES: string[] = [
  ...Object.keys(SCRIPT_HELPERS),
  ...CONTEXT_HELPER_NAMES,
]

// {{campo}} se compila a __v["campo"]; el guion doble evita choques con variables del autor.
export const SCRIPT_VALUES_PARAM: string = '__v'

// value: lo escrito en el campo; index: la repeticion dentro de un grupo (0 fuera de grupo).
export const SCRIPT_CONTEXT_PARAMS: string[] = [SCRIPT_VALUES_PARAM, 'value', 'index']

// El orden manda: es el mismo con el que el runtime pasa los argumentos.
export const SCRIPT_PARAM_NAMES: string[] = [
  ...SCRIPT_CONTEXT_PARAMS,
  ...Object.keys(SCRIPT_HELPERS),
  ...CONTEXT_HELPER_NAMES,
]

// Derivada del mismo objeto que los nombres: si se desalinearan, se correrian los argumentos sin
// aviso.
export const SCRIPT_HELPER_VALUES: ((...args: unknown[]) => number)[] =
  Object.values(SCRIPT_HELPERS)
