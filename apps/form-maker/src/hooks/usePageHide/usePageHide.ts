import { useEffect, useEffectEvent } from 'react'

// Avisa cuando la pagina puede morir sin mas aviso (B9 de docs/Plan-Movil.md): al quedar oculta
// (cambiar de app o de pestana, apagar la pantalla) y en pagehide (cerrar o recargar). El celular
// mata las pestanas de fondo sin beforeunload; visibilitychange es el ultimo momento seguro.
// Puede llamar dos veces seguidas (oculta y despues pagehide): quien guarda tiene que aguantarlo.
export function usePageHide(onHide: () => void): void {
  const handleHide = useEffectEvent(onHide)

  useEffect(() => {
    function handleVisibilityChange(): void {
      if (document.visibilityState === 'hidden') handleHide()
    }
    function handlePageHide(): void {
      handleHide()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [])
}
