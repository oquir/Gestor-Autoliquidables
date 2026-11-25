import { vi } from 'vitest'
import { HISTORY_BURST_MS } from '../../src/constants/history'

// Reloj de las pruebas de los stores. El historial junta en un solo paso los cambios que caen a
// menos de HISTORY_BURST_MS (createBurstGate lee Date.now): para probar un deshacer por accion,
// cada accion va despues de later(); para probar la rafaga, sin el.
//
// Trampa: createBurstGate toma Date.now como parametro por defecto al cargarse el store. startClock
// tiene que correr ANTES del import dinamico del store; despues, el historial sigue con el reloj real
// y junta todas las acciones de la prueba en una sola rafaga.

let now: number = Date.UTC(2026, 10, 24, 12, 0, 0)

export function startClock(): void {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
}

export function stopClock(): void {
  vi.useRealTimers()
}

// Fuera de la rafaga: la siguiente accion es un paso propio del historial.
export function later(): void {
  now += HISTORY_BURST_MS * 2
  vi.setSystemTime(now)
}

// Dentro de la rafaga: la siguiente accion se junta con la anterior.
export function soon(): void {
  now += HISTORY_BURST_MS / 5
  vi.setSystemTime(now)
}
