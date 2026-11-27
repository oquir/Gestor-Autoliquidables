import { useEffect } from 'react'
import { useLayoutMode } from '../../hooks'
import { useFormStore } from '../../store/formStore'
import type { LayoutMode } from '../../types'
import { SideDrawer } from '../molecules'
import { PhoneBottomBar } from '../organisms/PhoneBottomBar'
import { PhoneTopBar } from '../organisms/PhoneTopBar'
import type { AppLayoutProps } from './AppLayout.types'

export function AppLayout({ sidebar, canvas, canvasOverlay, rightSidebar }: AppLayoutProps) {
  const isSidebarOpen: boolean = useFormStore((state) => state.isSidebarOpen)
  const isRightSidebarOpen: boolean = useFormStore((state) => state.isRightSidebarOpen)
  const setSidebarOpen = useFormStore((state) => state.setSidebarOpen)
  const setRightSidebarOpen = useFormStore((state) => state.setRightSidebarOpen)
  // Debajo de 1280 los paneles son cajones encima del lienzo (T1 de docs/Plan-Movil.md): el lienzo
  // conserva su ancho y el ResizeObserver del puerto no se entera. Uno a la vez sale solo: el fondo
  // de un cajon tapa el boton que abre el otro.
  const layoutMode: LayoutMode = useLayoutMode()
  const isDesktop: boolean = layoutMode === 'desktop'
  // En el celular no hay riel: lo de abajo va en la barra de abajo y en hojas (P1 de
  // docs/Plan-Movil.md). El cajon izquierdo sigue: lo abre editar un campo.
  const isPhone: boolean = layoutMode === 'phone'
  const isLeftDrawer: boolean = !isDesktop && isSidebarOpen

  // Al angostarse la ventana (girar la tablet) los paneles abiertos del escritorio taparian el
  // lienzo. Al cargar ya arrancan cerrados (getInitialPanelsOpen).
  useEffect(() => {
    if (isDesktop) return
    setSidebarOpen(false)
    setRightSidebarOpen(false)
  }, [isDesktop, setSidebarOpen, setRightSidebarOpen])

  return (
    <div
      className={`flex h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 ${isPhone ? 'flex-col' : ''}`}
    >
      {isPhone && <PhoneTopBar />}

      {/* Con el cajon abierto el riel queda vacio: un solo Sidebar montado, o la paleta tendria
          dos draggables con el mismo id. */}
      {!isPhone && (
        <aside
          className={`relative flex shrink-0 flex-col h-full overflow-hidden bg-white transition-all ease-in-out border-r border-slate-200 dark:bg-neutral-900 dark:border-neutral-800 ${
            isDesktop && isSidebarOpen ? 'w-80 shadow-sm' : 'w-14'
          }`}
        >
          {!isLeftDrawer && (
            <div className="w-80 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto">{sidebar}</div>
            </div>
          )}
        </aside>
      )}

      {/* Al lado de main y no adentro: asi no se desplaza ni se escala con el lienzo.
          scrollbar-gutter estable porque el lienzo mide su raiz con el ancho del puerto. */}
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <main
          data-canvas-scroll
          className="relative flex-1 overflow-auto bg-slate-100 bg-dot-grid scrollbar-gutter-stable touch-pan-x touch-pan-y dark:bg-neutral-950"
        >
          {canvas}
        </main>
        {canvasOverlay}
      </div>

      {isPhone && <PhoneBottomBar />}

      {/* Plegado no se renderiza (no w-0): seguiria montado CanvasTabs con zonas de soltar
          invisibles. No anima el ancho: dispararia el ResizeObserver del puerto en cada frame. */}
      {isDesktop && isRightSidebarOpen && (
        <aside className="animate-right-panel-in relative flex h-full w-80 shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {rightSidebar}
        </aside>
      )}

      {isLeftDrawer && (
        <SideDrawer label="Panel de campos" side="left" onClose={() => setSidebarOpen(false)}>
          <div className="min-h-0 flex-1">{sidebar}</div>
        </SideDrawer>
      )}

      {!isDesktop && isRightSidebarOpen && (
        <SideDrawer
          label="Panel del proyecto"
          side="right"
          onClose={() => setRightSidebarOpen(false)}
        >
          {rightSidebar}
        </SideDrawer>
      )}
    </div>
  )
}
