import { describe, expect, it } from 'vitest'
import { buildIcaModel, defaultContext, groupIdByName } from '../helpers/runtimeHarness'
import type { PreviewState, RuntimeModel, RuntimeSnapshot, RuntimeValues } from '../../src/types'
import { createInitialState, resolveRuntime } from '../../src/lib/formRuntime/formRuntime'

// Golden del ICA: la plantilla de fabrica pasa por el export y el runtime del simulador, el mismo
// camino que recorre el consumidor. Los esperados se sacaron a mano de docs/Dominio-ICA.md (tabla
// del FUN) y de los scripts de los renglones 31 y 37; si cambia un numero, primero se revisa la
// cuenta, no la prueba.
//
// Declaracion de ejemplo, ano gravable 2025, vence el 2026/03/31 (tabla por defecto):
//   r8 600.000.000, r9 50.000.000 -> r10 550.000.000; r11 20.000.000, r12 30.000.000 -> r16 500 M
//   actividad 1: 300 M al 4 por mil = 1.200.000; actividad 2: 200 M al 7,5 = 1.500.000
//   r17 = r20 = 2.700.000; r21 = 15% = 405.000; r23 bomberil 27.000
//   r25 = 2.700.000 + 405.000 + 27.000 = 3.132.000
//   r27 retenciones 500.000, r29 anticipo anterior 300.000, r30 anticipo siguiente 400.000
//   r39 aporte voluntario 10.000

const DOCUMENTO: string = '900123456'

const ROOT_VALUES: RuntimeValues = {
  periodo_anio: '2025',
  id_periodo_anual: '7',
  id_tipo_declaracion: '1',
  tipo_documento: '2',
  numero_documento: DOCUMENTO,
  total_ingresos_nacionales: 600_000_000,
  ingresos_fuera_municipio: 50_000_000,
  ingresos_devoluciones_descuentos: 20_000_000,
  ingresos_exportaciones: 30_000_000,
  ingresos_venta_activos: 0,
  ingresos_excluidos_no_gravados: 0,
  ingresos_exentos_municipio: 0,
  impuesto_ley_56: 0,
  pago_unidades_sector_financiero: 0,
  sobretasa_bomberil: 27_000,
  sobretasa_seguridad: 0,
  valor_exencion_exoneracion_impuesto: 0,
  retenciones_a_favor: 500_000,
  autorretenciones_a_favor: 0,
  anticipo_liquidado_anio_anterior: 300_000,
  anticipo_anio_siguiente: 400_000,
  saldo_favor_periodo_anterior: 0,
  descuento_pronto_pago: 0,
  valor_aporte_voluntario: 10_000,
}

const ACTIVIDADES: RuntimeValues[] = [
  { ingresos_gravados: 300_000_000, tarifa_x_mil: 4 },
  { ingresos_gravados: 200_000_000, tarifa_x_mil: 7.5 },
]

function declarar(model: RuntimeModel, extra: RuntimeValues): PreviewState {
  const initial: PreviewState = createInitialState(model)
  const groupId: string = groupIdByName(model, 'actividades')

  return {
    values: { ...ROOT_VALUES, ...extra },
    groups: { ...initial.groups, [groupId]: ACTIVIDADES },
  }
}

function resolver(extra: RuntimeValues, hoy: string): RuntimeSnapshot {
  const model: RuntimeModel = buildIcaModel()

  return resolveRuntime(model, declarar(model, extra), defaultContext(model, hoy))
}

describe('golden del ICA: declaración a tiempo', () => {
  // A tiempo, sin sancion: el 31 no es extemporaneidad y el valor lo escribe el declarante.
  const snapshot: RuntimeSnapshot = resolver({ valor_sancion: 0 }, '2026/03/15')
  const values: RuntimeValues = snapshot.root.values

  it('corre sin ciclos ni errores de script', () => {
    expect(snapshot.cycle).toBeNull()
    expect(snapshot.issues).toEqual([])
  })

  it('calcula la base gravable y el impuesto por actividad', () => {
    expect(values.total_ingresos_ordinarios).toBe(550_000_000)
    expect(values.total_ingresos_gravables).toBe(500_000_000)
    expect(values.total_impuesto).toBe(2_700_000)
    expect(values.total_impuesto_industria_comercio).toBe(2_700_000)
    expect(values.impuesto_avisos_tableros).toBe(405_000)
  })

  it('renglón 25: total impuesto a cargo', () => {
    expect(values.total_impuesto_a_cargo).toBe(3_132_000)
  })

  it('renglón 31: sin extemporaneidad queda lo que se escribió', () => {
    expect(values.valor_sancion).toBe(0)
    expect(snapshot.root.computed.valor_sancion).toBeFalsy()
  })

  it('renglón 33 y 34: saldo a cargo, sin saldo a favor', () => {
    // 3.132.000 - 500.000 - 300.000 + 400.000
    expect(values.total_saldo_a_cargo).toBe(2_732_000)
    expect(values.total_saldo_a_favor).toBe(0)
  })

  it('renglón 35: valor a pagar igual al 33', () => {
    expect(values.valor_a_pagar).toBe(2_732_000)
  })

  it('renglón 37: a tiempo, sin intereses', () => {
    expect(values.interes_mora).toBe(0)
  })

  it('renglón 38 y 40: total a pagar, con y sin aporte voluntario', () => {
    expect(values.total_a_pagar).toBe(2_732_000)
    expect(values.total_a_pagar_con_aporte_voluntario).toBe(2_742_000)
  })
})

describe('golden del ICA: declaración extemporánea', () => {
  // Presentada el 2026/06/10: 71 dias y 3 meses o fraccion despues del 2026/03/31.
  const snapshot: RuntimeSnapshot = resolver({ tipo_sancion: '1' }, '2026/06/10')
  const values: RuntimeValues = snapshot.root.values

  it('corre sin ciclos ni errores de script', () => {
    expect(snapshot.cycle).toBeNull()
    expect(snapshot.issues).toEqual([])
  })

  it('renglón 25 no cambia con la mora', () => {
    expect(values.total_impuesto_a_cargo).toBe(3_132_000)
  })

  it('renglón 31: la sanción mínima de 10 UVT gana a 5% x 3 meses', () => {
    // 3.132.000 x 5% x 3 = 469.800 < 10 x 52.374 (UVT 2026) = 523.740, al millar 524.000.
    expect(values.valor_sancion).toBe(524_000)
    expect(snapshot.root.computed.valor_sancion).toBe(true)
  })

  it('renglón 33: suma la sanción', () => {
    expect(values.total_saldo_a_cargo).toBe(3_256_000)
    expect(values.total_saldo_a_favor).toBe(0)
  })

  it('renglón 35: valor a pagar', () => {
    expect(values.valor_a_pagar).toBe(3_256_000)
  })

  it('renglón 37: intereses diarios sobre el 35, al millar hacia arriba', () => {
    // 3.256.000 x (27,66% / 365) x 71 = 175.187,08 -> 176.000.
    expect(values.interes_mora).toBe(176_000)
    expect(snapshot.root.computed.interes_mora).toBe(true)
  })

  it('renglón 38 y 40: total a pagar con intereses', () => {
    expect(values.total_a_pagar).toBe(3_432_000)
    expect(values.total_a_pagar_con_aporte_voluntario).toBe(3_442_000)
  })
})

describe('golden del ICA: sanción proporcional', () => {
  // Con 12 meses o fraccion la proporcional pasa al minimo: 3.132.000 x 5% x 12 = 1.879.200.
  const values: RuntimeValues = resolver({ tipo_sancion: '1' }, '2027/03/31').root.values

  it('renglón 31: 5% por mes sobre el 25, al millar', () => {
    expect(values.valor_sancion).toBe(1_879_000)
  })

  it('renglón 33: suma la sanción', () => {
    expect(values.total_saldo_a_cargo).toBe(2_732_000 + 1_879_000)
  })
})

describe('golden del ICA: saldo a favor', () => {
  // Retenciones mayores que el impuesto: 3.132.000 - 4.000.000 - 300.000 + 400.000 = -768.000.
  const values: RuntimeValues = resolver(
    { valor_sancion: 0, retenciones_a_favor: 4_000_000 },
    '2026/06/10',
  ).root.values

  it('renglón 33 queda en 0 y el 34 lleva el saldo a favor', () => {
    expect(values.total_saldo_a_cargo).toBe(0)
    expect(values.total_saldo_a_favor).toBe(768_000)
  })

  it('renglón 35 y 37: sin deuda no hay intereses aunque sea tarde', () => {
    expect(values.valor_a_pagar).toBe(0)
    expect(values.interes_mora).toBe(0)
  })

  it('renglón 38 no baja de 0 y el 40 es solo el aporte', () => {
    expect(values.total_a_pagar).toBe(0)
    expect(values.total_a_pagar_con_aporte_voluntario).toBe(10_000)
  })
})

describe('golden del ICA: sin tabla de vencimientos para el año', () => {
  // 2014 no esta en la tabla por defecto (2016-2025 en 2026): sin fecha limite el 37 queda
  // tecleable y el 31 no sanciona.
  const snapshot: RuntimeSnapshot = resolver(
    { periodo_anio: '2014', tipo_sancion: '1', interes_mora: 0 },
    '2026/06/10',
  )

  it('renglón 31: sin mora calculable no hay sanción', () => {
    expect(snapshot.root.values.valor_sancion).toBe(0)
  })

  it('renglón 37: no se calcula y queda lo escrito', () => {
    expect(snapshot.root.values.interes_mora).toBe(0)
    expect(snapshot.root.computed.interes_mora).toBeFalsy()
  })
})
