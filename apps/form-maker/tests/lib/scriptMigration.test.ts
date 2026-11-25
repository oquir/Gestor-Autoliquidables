import { describe, expect, it } from 'vitest'
import { formulaToScript, upgradeFieldRefs } from '../../src/lib/scriptMigration/scriptMigration'

describe('formulaToScript', () => {
  it('traduce referencias, números y operadores', () => {
    expect(formulaToScript('ingresos * tarifa / 1000')).toBe('return {ingresos} * {tarifa} / 1000;')
    expect(formulaToScript('1.5 + a')).toBe('return 1.5 + {a};')
  })

  it('pone paréntesis solo donde la precedencia los necesita', () => {
    expect(formulaToScript('(a + b) * c')).toBe('return ({a} + {b}) * {c};')
    expect(formulaToScript('a + (b * c)')).toBe('return {a} + {b} * {c};')
    expect(formulaToScript('a - (b - c)')).toBe('return {a} - ({b} - {c});')
    expect(formulaToScript('(a - b) - c')).toBe('return {a} - {b} - {c};')
    expect(formulaToScript('a / (b * c)')).toBe('return {a} / ({b} * {c});')
  })

  it('el menos unario se conserva y el más se cae', () => {
    expect(formulaToScript('-a + +b')).toBe('return -{a} + {b};')
    expect(formulaToScript('-(a + b)')).toBe('return -({a} + {b});')
  })

  it('las funciones pasan con sus argumentos', () => {
    expect(formulaToScript('max(a - b, 0)')).toBe('return max({a} - {b}, 0);')
    expect(formulaToScript('round(a, 2)')).toBe('return round({a}, 2);')
    expect(formulaToScript('dvNit(nit)')).toBe('return dvNit({nit});')
  })

  it('sumOf y countOf pasan a sum y count de la columna', () => {
    expect(formulaToScript('sumOf(impuesto) + countOf(fila)')).toBe(
      'return sum({impuesto}) + count({fila});',
    )
  })

  it('un campo puede llamarse como una función si no lleva paréntesis', () => {
    expect(formulaToScript('max + 1')).toBe('return {max} + 1;')
  })

  it('lo que no se puede traducir da null', () => {
    expect(formulaToScript('')).toBeNull()
    expect(formulaToScript('a + * b')).toBeNull()
    expect(formulaToScript('(a + b')).toBeNull()
    expect(formulaToScript('a b')).toBeNull()
    expect(formulaToScript('noExiste(a)')).toBeNull()
    expect(formulaToScript('abs(a, b)')).toBeNull()
    expect(formulaToScript('round()')).toBeNull()
    expect(formulaToScript('sumOf(a + b)')).toBeNull()
    expect(formulaToScript('a % b')).toBeNull()
  })
})

describe('upgradeFieldRefs', () => {
  const known: Set<string> = new Set(['base', 'tarifa'])

  it('pasa {campo} a {{campo}} solo para campos conocidos', () => {
    expect(upgradeFieldRefs('return {base} * { tarifa } + {otro};', known)).toBe(
      'return {{base}} * {{tarifa}} + {otro};',
    )
  })

  it('no toca strings, comentarios ni objetos literales', () => {
    const source: string = "const s = '{base}'; // {base}\nconst o = {a: 1}; return {base};"

    expect(upgradeFieldRefs(source, known)).toBe(
      "const s = '{base}'; // {base}\nconst o = {a: 1}; return {{base}};",
    )
  })

  it('sin referencias devuelve el mismo texto', () => {
    expect(upgradeFieldRefs('return 1;', known)).toBe('return 1;')
  })

  it('migrado y compilado da el mismo cuerpo que antes', () => {
    // La forma de una llave del compilador viejo, migrada, es una referencia nueva sin perder nada.
    expect(upgradeFieldRefs(formulaToScript('base * tarifa') ?? '', known)).toBe(
      'return {{base}} * {{tarifa}};',
    )
  })
})
