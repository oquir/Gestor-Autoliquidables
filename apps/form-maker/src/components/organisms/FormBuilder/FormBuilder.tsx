import { DndContext, DragOverlay } from '@dnd-kit/core'
import { lazy, type ReactElement, Suspense, useMemo } from 'react'
import { useDragAndDrop } from '../../../hooks/useDragAndDrop/useDragAndDrop'
import { useFormStore } from '../../../store/formStore'
import { ErrorBoundary } from '../../atoms/ErrorBoundary/ErrorBoundary'
import { SimulatorLoading } from '../../atoms/SimulatorLoading/SimulatorLoading'
import { AppLayout } from '../../layout/AppLayout'
import { DragPreview } from '../../molecules/DragPreview/DragPreview'
import { Canvas } from '../Canvas/Canvas'
import { ActiveStepLabel } from '../ActiveStepLabel/ActiveStepLabel'
import { CanvasToolbar } from '../CanvasToolbar/CanvasToolbar'
import { CollapsedRightSidebar } from '../CollapsedRightSidebar/CollapsedRightSidebar'
import { PdfDesignerCrashScreen } from '../PdfDesignerCrashScreen/PdfDesignerCrashScreen'
import { RightSidebar } from '../RightSidebar/RightSidebar'
import { Sidebar } from '../Sidebar/Sidebar'
import { SimulatorCrashScreen } from '../SimulatorCrashScreen/SimulatorCrashScreen'
import { OVERLAY_STYLE } from './FormBuilder.constants'

// Chunk aparte: los catalogos de mentira y zod pesan mas que el resto. La frontera solo corta si el
// builder no importa ese subarbol.
const FormSimulator = lazy(() =>
  import('../FormSimulator/FormSimulator').then((module) => ({ default: module.FormSimulator })),
)

// El disenador de PDF tambien va en su propio chunk.
const PdfDesigner = lazy(() =>
  import('../PdfDesigner/PdfDesigner').then((module) => ({ default: module.PdfDesigner })),
)

export function FormBuilder() {
  const {
    sensors,
    activeDrag,
    collisionDetection,
    overlayModifiers,
    dropAnimation,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  } = useDragAndDrop()
  const isSimulatorOpen = useFormStore((state) => state.isSimulatorOpen)
  const isPdfDesignerOpen = useFormStore((state) => state.isPdfDesignerOpen)
  // El mismo elemento en cada render: FormBuilder se repinta al empezar y al terminar cada arrastre
  // (activeDrag) y, con uno nuevo, repintaba la app entera (auditoria O2).
  const layout: ReactElement = useMemo(
    () => (
      <AppLayout
        sidebar={<Sidebar />}
        canvas={<Canvas />}
        canvasOverlay={
          <>
            <ActiveStepLabel />
            <CanvasToolbar />
            <CollapsedRightSidebar />
          </>
        }
        rightSidebar={<RightSidebar />}
      />
    ),
    [],
  )

  // El simulador ocupa la pantalla y tiene su propia frontera de errores: si falla, se vuelve al
  // editor sin recargar.
  if (isSimulatorOpen) {
    return (
      <ErrorBoundary fallback={(message) => <SimulatorCrashScreen message={message} />}>
        <Suspense fallback={<SimulatorLoading />}>
          <FormSimulator />
        </Suspense>
      </ErrorBoundary>
    )
  }

  if (isPdfDesignerOpen) {
    return (
      <ErrorBoundary fallback={(message) => <PdfDesignerCrashScreen message={message} />}>
        <Suspense fallback={<SimulatorLoading label="Cargando diseñador de PDF…" />}>
          <PdfDesigner />
        </Suspense>
      </ErrorBoundary>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {layout}
      <DragOverlay modifiers={overlayModifiers} style={OVERLAY_STYLE} dropAnimation={dropAnimation}>
        {activeDrag ? <DragPreview activeDrag={activeDrag} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
