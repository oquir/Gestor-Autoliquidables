import { describe, expect, it } from 'vitest'
import { makeField, makeStep, modelOf } from '../helpers/canvasFixtures'
import type { RuntimeContext, RuntimeModel, RuntimeValues, ScriptRunResult } from '../../src/types'
import { compileScript } from '../../src/lib/fieldScript/fieldScript'
import {
  coerceForScript,
  coerceValues,
  runFieldScript,
} from '../../src/lib/scriptRuntime/scriptRuntime'

// Corre un script escrito con {{campo}} como lo hace el runtime: compilado y con los helpers.
function run(
  source: string,
  values: RuntimeValues = {},
  options: { prelude?: string; value?: unknown; index?: number; context?: RuntimeContext } = {},
): ScriptRunResult {
  const known: Set<string> = new Set(Object.keys(values))
  const { code } = compileScript(source, known)

  return runFieldScript(
    code,
    options.prelude ?? '',
    values,
    options.value,
    options.index ?? 0,
    options.context,
  )
}

describe('runFieldScript', () => {
  it('lee los campos y devuelve el resultado', () => {
    expect(run('return {{a}} * {{b}};', { a: 3, b: 4 })).toEqual({ value: 12, error: null })
  })

  it('recibe el valor escrito y la repetición del grupo', () => {
    expect(run('return value + index;', {}, { value: 10, index: 2 }).value).toBe(12)
  })

  it('las funciones del preludio quedan en ámbito', () => {
    expect(
      run('return doble({{a}});', { a: 5 }, { prelude: 'function doble(x) { return x * 2; }' })
        .value,
    ).toBe(10)
  })

  it('un error en tiempo de ejecución viaja en el resultado, no se lanza', () => {
    const result: ScriptRunResult = run('return noExiste();')

    expect(result.value).toBeUndefined()
    expect(result.error).toContain('noExiste')
  })

  it('un script que no compila devuelve el error, también la segunda vez (caché)', () => {
    const first: ScriptRunResult = run('return (;')
    const second: ScriptRunResult = run('return (;')

    expect(first.error).not.toBeNull()
    expect(second.error).toBe(first.error)
  })

  it('un Infinity sale null: no viaja al payload', () => {
    expect(run('return 1 / 0;').value).toBeNull()
  })
})

describe('helpers del script', () => {
  it('sum y count aplanan la columna de un grupo', () => {
    expect(run('return sum({{col}});', { col: [1, '2', 3] }).value).toBe(6)
    expect(run('return sum({{col}}, 10);', { col: [1, 2] }).value).toBe(13)
    expect(run('return count({{col}});', { col: [1, 2, 3] }).value).toBe(3)
  })

  it('lo que no es número legible vale 0', () => {
    expect(run('return num("abc") + num("") + num(null) + num(true);').value).toBe(1)
    expect(run('return num(" 12.5 ");').value).toBe(12.5)
  })

  it('min, max, abs, floor, ceil y round', () => {
    expect(run('return max(-1, 5, "7");').value).toBe(7)
    expect(run('return min(3, -2);').value).toBe(-2)
    expect(run('return abs(-4);').value).toBe(4)
    expect(run('return floor(2.7) + ceil(2.1);').value).toBe(5)
    expect(run('return round(2.5);').value).toBe(3)
    expect(run('return round(1.2345, 2);').value).toBe(1.23)
  })

  it('round redondea la magnitud: los negativos empatan simétricos y no queda -0', () => {
    expect(run('return round(-2.5);').value).toBe(-3)
    expect(run('return round(-1500, -3);').value).toBe(-2000)
    expect(run('return round(1500, -3);').value).toBe(2000)
    expect(Object.is(run('return round(-0.4);').value, 0)).toBe(true)
  })

  it('dvNit calcula el dígito de verificación de la DIAN', () => {
    expect(run('return dvNit(890903938);').value).toBe(8)
    expect(run('return dvNit("800197268");').value).toBe(4)
    expect(run('return dvNit(900123456);').value).toBe(8)
  })

  it('dvNit lee un NIT escrito con puntos o con el DV tras el guion', () => {
    expect(run('return dvNit("900.123.456");').value).toBe(8)
    expect(run('return dvNit("900.123.456-8");').value).toBe(8)
    expect(run('return dvNit(" 890 903 938 ");').value).toBe(8)
  })

  // RIESGO (hallazgo 4.7 de docs/Hallazgos-Pruebas.md): num() lee el punto como decimal (como
  // JavaScript) y numberFormat como miles, y corta en la coma. Fija lo que pasa hoy.
  it('num lee el punto como decimal y corta en la coma', () => {
    expect(run('return num("1.234,56");').value).toBe(1.234)
    expect(run('return num("1,5");').value).toBe(1)
  })

  it('uvt y smmlv leen la tabla del contexto; sin año, el de hoy', () => {
    const context: RuntimeContext = {
      reglas: [],
      hoy: '2026/06/10',
      valores: [
        { anio: 2026, uvt: 52374, smmlv: 1750905 },
        { anio: 2025, uvt: 49799, smmlv: 1423500 },
      ],
    }

    expect(run('return uvt();', {}, { context }).value).toBe(52374)
    expect(run('return uvt(2025);', {}, { context }).value).toBe(49799)
    expect(run('return smmlv(2025);', {}, { context }).value).toBe(1423500)
    expect(run('return uvt(2019) ?? 1;', {}, { context }).value).toBe(1)
  })

  it('sin contexto los helpers de fecha y valores no rompen el script', () => {
    expect(run('return [fechaLimite(2025), diasDeMora(2025), uvt()];').value).toEqual([
      null,
      0,
      null,
    ])
  })
})

describe('coerceValues', () => {
  const model: RuntimeModel = modelOf([
    makeStep('Datos', [
      makeField('number', 'monto'),
      makeField('calculated', 'total'),
      makeField('checkbox', 'acepta'),
      makeField('text', 'nombre'),
    ]),
  ])

  it('coacciona por tipo y rellena los campos sin tocar', () => {
    expect(coerceValues({ monto: '5', acepta: 1, nombre: 'Ana' }, model)).toEqual({
      monto: 5,
      total: 0,
      acepta: true,
      nombre: 'Ana',
    })
  })

  it('"5" + "3" no da "53"', () => {
    const values: RuntimeValues = coerceValues({ monto: '5', total: '3' }, model)

    expect((values.monto as number) + (values.total as number)).toBe(8)
  })

  it('lo que viene por fuera del modelo pasa tal cual', () => {
    expect(coerceValues({ extra: '7' }, model).extra).toBe('7')
  })

  it('una columna de grupo se coacciona elemento por elemento', () => {
    expect(coerceForScript(['1', '', 'x'], 'number')).toEqual([1, 0, 0])
    expect(coerceForScript([0, 'si'], 'checkbox')).toEqual([false, true])
    expect(coerceForScript('texto', 'select')).toBe('texto')
  })
})
