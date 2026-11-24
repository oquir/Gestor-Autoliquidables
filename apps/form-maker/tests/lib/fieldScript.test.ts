import { describe, expect, it } from 'vitest'
import type { ScriptCompileResult, ScriptValidation } from '../../src/types'
import {
  checkScriptSyntax,
  compileScript,
  composeScriptBody,
  fieldRefText,
  normalizeScriptResult,
  unknownRefsMessage,
  validateFieldScript,
  validatePrelude,
} from '../../src/lib/fieldScript/fieldScript'

const KNOWN: Set<string> = new Set(['ingresos', 'tarifa', 'total'])

describe('fieldRefText y unknownRefsMessage', () => {
  it('escribe la referencia con llaves dobles', () => {
    expect(fieldRefText('ingresos')).toBe('{{ingresos}}')
  })

  it('el mensaje concuerda en número', () => {
    expect(unknownRefsMessage(['x'])).toBe('{{x}} no es un campo del formulario.')
    expect(unknownRefsMessage(['x', 'y'])).toBe('{{x}}, {{y}} no son campos del formulario.')
  })
})

describe('compileScript', () => {
  it('sustituye cada campo conocido por su lectura y junta las dependencias sin repetir', () => {
    const result: ScriptCompileResult = compileScript(
      'return {{ingresos}} * {{ tarifa }} / 1000 + {{ingresos}};',
      KNOWN,
    )

    expect(result.code).toBe('return __v["ingresos"] * __v["tarifa"] / 1000 + __v["ingresos"];')
    expect(result.reads).toEqual(['ingresos', 'tarifa'])
    expect(result.unknown).toEqual([])
    expect(result.refs).toHaveLength(3)
  })

  it('una referencia desconocida queda intacta y se reporta', () => {
    const result: ScriptCompileResult = compileScript('return {{otro}} + {{total}};', KNOWN)

    expect(result.code).toBe('return {{otro}} + __v["total"];')
    expect(result.unknown).toEqual(['otro'])
    expect(result.reads).toEqual(['total'])
  })

  it('no ve referencias dentro de strings ni comentarios', () => {
    const source: string = [
      "const a = '{{ingresos}}';",
      'const b = "{{tarifa}}";',
      '// {{total}}',
      '/* {{total}} */',
      'return a + b;',
    ].join('\n')
    const result: ScriptCompileResult = compileScript(source, KNOWN)

    expect(result.code).toBe(source)
    expect(result.refs).toEqual([])
  })

  it('en un template literal solo cuenta lo que está dentro de ${...}', () => {
    const result: ScriptCompileResult = compileScript(
      'return `{{ingresos}} vale ${ {{ingresos}} + 1 }`;',
      KNOWN,
    )

    expect(result.code).toBe('return `{{ingresos}} vale ${ __v["ingresos"] + 1 }`;')
    expect(result.reads).toEqual(['ingresos'])
  })

  it('una comilla sin cerrar no se traga el resto del script', () => {
    const result: ScriptCompileResult = compileScript("const a = 'roto\nreturn {{total}};", KNOWN)

    expect(result.reads).toEqual(['total'])
  })

  it('las llaves de un objeto no se confunden con referencias', () => {
    const result: ScriptCompileResult = compileScript(
      'const o = { a: {{total}} }; return o.a;',
      KNOWN,
    )

    expect(result.code).toBe('const o = { a: __v["total"] }; return o.a;')
  })

  it('una referencia partida en dos líneas no es referencia', () => {
    expect(compileScript('return {{\ntotal}};', KNOWN).refs).toEqual([])
  })
})

describe('validateFieldScript', () => {
  it('un script vacío es válido', () => {
    const result: ScriptValidation = validateFieldScript('   ', KNOWN)

    expect(result.isEmpty).toBe(true)
    expect(result.isValid).toBe(true)
  })

  it('la referencia desconocida gana al error de sintaxis', () => {
    const result: ScriptValidation = validateFieldScript('return {{nada}} +;', KNOWN)

    expect(result.isValid).toBe(false)
    expect(result.error).toBe('{{nada}} no es un campo del formulario.')
  })

  it('reporta un error de sintaxis del propio script', () => {
    const result: ScriptValidation = validateFieldScript('return {{total}} +;', KNOWN)

    expect(result.isValid).toBe(false)
    expect(result.error).not.toBeNull()
  })

  it('un preludio roto se reporta como del formulario, no del campo', () => {
    const result: ScriptValidation = validateFieldScript('return {{total}};', KNOWN, 'const x = ;')

    expect(result.isValid).toBe(false)
    expect(result.error?.startsWith('El script del formulario no compila:')).toBe(true)
  })

  it('con preludio sano, el script puede usar sus funciones', () => {
    const result: ScriptValidation = validateFieldScript(
      'return doble({{total}});',
      KNOWN,
      'function doble(x) { return x * 2; }',
    )

    expect(result.isValid).toBe(true)
  })
})

describe('validatePrelude', () => {
  it('no puede leer campos', () => {
    const result = validatePrelude('const x = {{total}};')

    expect(result.isValid).toBe(false)
    expect(result.refs.map((ref) => ref.name)).toEqual(['total'])
    // Con alguna {{x}} no se revisa la sintaxis.
    expect(result.error).toBeNull()
  })

  it('revisa la sintaxis cuando no lee campos', () => {
    expect(validatePrelude('const TASA = 0.05;').isValid).toBe(true)
    expect(validatePrelude('const TASA = ;').isValid).toBe(false)
    expect(validatePrelude('').isEmpty).toBe(true)
  })
})

describe('composeScriptBody, checkScriptSyntax y normalizeScriptResult', () => {
  it('el preludio va delante y uno vacío no agrega nada', () => {
    expect(composeScriptBody('return 1;', 'const A = 1;')).toBe('const A = 1;\nreturn 1;')
    expect(composeScriptBody('return 1;', '   ')).toBe('return 1;')
    expect(composeScriptBody('return 1;')).toBe('return 1;')
  })

  it('checkScriptSyntax da null si compila', () => {
    expect(checkScriptSyntax('return 1;')).toBeNull()
    expect(checkScriptSyntax('return (;')).not.toBeNull()
  })

  it('un resultado no finito sale null', () => {
    expect(normalizeScriptResult(Number.POSITIVE_INFINITY)).toBeNull()
    expect(normalizeScriptResult(Number.NaN)).toBeNull()
    expect(normalizeScriptResult(5)).toBe(5)
    expect(normalizeScriptResult('texto')).toBe('texto')
    expect(normalizeScriptResult(undefined)).toBeUndefined()
  })
})
