import { useEffect, useEffectEvent } from 'react'
import { pinchDistance, pinchFrame } from '../../lib'
import type { PinchFrame, PinchPoint } from '../../types'
import type { PinchZoomHandlers } from './usePinchZoom.types'

// Pellizco con dos dedos sobre el puerto de un lienzo (B10 de docs/Plan-Movil.md; el formulario y
// el PDF). El puerto lleva touch-action: pan-x pan-y: un dedo desplaza nativo y el navegador ya no
// acerca la pagina entera con dos. La cuenta es de lib/canvasZoom.
// Todo pasivo, a proposito: un touchmove con passive: false obliga a Chrome a esperar al JS en cada
// desplazamiento de un dedo. Si los dedos se mueven juntos el lienzo tambien se desplaza (como un
// mapa), y el ancla se toma en cada cuadro con el scroll ya movido, asi que las dos cosas se suman.
// Un cuadro por requestAnimationFrame: el touchmove llega a 120 Hz y cada zoom repinta el lienzo.

function pointOf(touch: Touch): PinchPoint {
  return { x: touch.clientX, y: touch.clientY }
}

export function usePinchZoom(port: HTMLElement | null, handlers: PinchZoomHandlers): void {
  const start = useEffectEvent(handlers.onStart)
  const pinch = useEffectEvent(handlers.onPinch)

  useEffect(() => {
    if (!port) return

    let startDistance: number | null = null
    let latest: PinchFrame | null = null
    let frame: number | null = null

    function flush(): void {
      frame = null
      if (latest) pinch(latest)
      latest = null
    }

    function handleTouchStart(event: TouchEvent): void {
      if (event.touches.length !== 2) return
      startDistance = pinchDistance(pointOf(event.touches[0]), pointOf(event.touches[1]))
      start()
    }

    function handleTouchMove(event: TouchEvent): void {
      if (startDistance === null || event.touches.length !== 2) return
      latest = pinchFrame(startDistance, pointOf(event.touches[0]), pointOf(event.touches[1]))
      if (frame === null) frame = requestAnimationFrame(flush)
    }

    // Al levantar un dedo termina: el que queda desplaza nativo.
    function handleTouchEnd(event: TouchEvent): void {
      if (event.touches.length < 2) startDistance = null
    }

    port.addEventListener('touchstart', handleTouchStart, { passive: true })
    port.addEventListener('touchmove', handleTouchMove, { passive: true })
    port.addEventListener('touchend', handleTouchEnd, { passive: true })
    port.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      port.removeEventListener('touchstart', handleTouchStart)
      port.removeEventListener('touchmove', handleTouchMove)
      port.removeEventListener('touchend', handleTouchEnd)
      port.removeEventListener('touchcancel', handleTouchEnd)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [port])
}
